const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Mood = require('../src/models/Mood');
const MoodReportShare = require('../src/models/MoodReportShare');
const moodRoutes = require('../src/routes/moodRoutes');
const moodReportRoutes = require('../src/routes/moodReportRoutes');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

const addDaysKey = (key, days) => {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
};

const startOfWeekKey = (value = new Date()) => {
  const key = dateKey(value);
  const day = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return addDaysKey(key, day === 0 ? -6 : 1 - day);
};

const monthKey = (value = new Date()) => dateKey(value).slice(0, 7);

const request = async (port, method, path, { token, body } = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/pdf')) data = Buffer.from(await response.arrayBuffer());
  else if (contentType.includes('text/csv')) data = await response.text();
  else data = await response.json().catch(() => ({}));

  return { status: response.status, body: data, contentType };
};

const mount = (app, path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === '') req.url = '/';
    next();
  }, router);
};

describe('mood history, trends, patterns, and reports', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let userSeq = 0;

  const makeUser = async () => {
    userSeq += 1;
    const user = await User.create({
      name: `Mood Tester ${userSeq}`,
      email: `mood-trends-${userSeq}@carecircle.test`,
      phoneNumber: `+1000000${String(userSeq).padStart(4, '0')}`,
      password: 'password',
    });
    return { user, token: signToken(user) };
  };

  const seed = (user, entries) =>
    Mood.insertMany(
      entries.map((entry) => ({
        userId: user._id,
        // Noon UTC keeps the entry inside its calendar day for range queries.
        date: new Date(`${entry.date}T12:00:00.000Z`),
        mood: entry.mood,
        intensity: entry.intensity,
        notes: entry.notes,
        activities: entry.activities || [],
        tags: entry.tags || [],
      }))
    );

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    mount(app, '/api/moods', moodRoutes);
    mount(app, '/api/mood-reports', moodReportRoutes);

    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    port = server.address().port;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  // US-21
  it('returns mood history with a summary and a day-by-day timeline', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();
    await seed(user, [
      { date: today, mood: 'happy', intensity: 8, activities: ['walk'] },
      { date: addDaysKey(today, -1), mood: 'sad', intensity: 3 },
      { date: addDaysKey(today, -2), mood: 'neutral' },
    ]);

    const response = await request(port, 'GET', '/api/moods/history', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.entryCount, 3);
    // happy(5) + sad(2) + neutral(3) = 10 / 3
    assert.equal(response.body.summary.averageScore, 3.33);
    assert.equal(response.body.items.length, 3);
    assert.equal(response.body.items[0].mood, 'happy', 'newest entry comes first');
    assert.equal(response.body.items[0].score, 5);
    assert.equal(response.body.items[0].valence, 'positive');
    assert.equal(response.body.timeline.length, 30);
    assert.ok(response.body.timeline.some((day) => day.date === today && day.entryCount === 1));
  });

  it('rejects a malformed history range and requires a token', async () => {
    const { token } = await makeUser();

    const badDate = await request(port, 'GET', '/api/moods/history?start=2026-13-45', { token });
    assert.equal(badDate.status, 400);

    const backwards = await request(port, 'GET', '/api/moods/history?start=2026-05-10&end=2026-05-01', { token });
    assert.equal(backwards.status, 400);

    const anonymous = await request(port, 'GET', '/api/moods/history');
    assert.equal(anonymous.status, 401);
  });

  // US-22
  it('buckets weekly trends and compares this week with last week', async () => {
    const { user, token } = await makeUser();
    const thisWeek = startOfWeekKey();
    const lastWeek = addDaysKey(thisWeek, -7);

    await seed(user, [
      { date: thisWeek, mood: 'happy' },
      { date: thisWeek, mood: 'great' },
      { date: lastWeek, mood: 'sad' },
      { date: addDaysKey(lastWeek, 1), mood: 'stressed' },
    ]);

    const response = await request(port, 'GET', '/api/moods/trends/weekly?weeks=2', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.weeks.length, 2);
    assert.equal(response.body.thisWeek.averageScore, 5);
    assert.equal(response.body.lastWeek.averageScore, 2);
    assert.equal(response.body.thisWeek.isCurrentWeek, true);
    assert.equal(response.body.weekOverWeek.verdict, 'improved');
    assert.equal(response.body.weekOverWeek.scoreDelta, 3);
    assert.equal(response.body.trend.direction, 'improving');
    assert.equal(response.body.thisWeek.days.length, 7);
  });

  // US-23
  it('buckets monthly trends with best and hardest days', async () => {
    const { user, token } = await makeUser();
    const month = monthKey();

    await seed(user, [
      { date: `${month}-01`, mood: 'great' },
      { date: `${month}-02`, mood: 'depressed' },
    ]);

    const response = await request(port, 'GET', '/api/moods/trends/monthly?months=3', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.months.length, 3);
    assert.equal(response.body.thisMonth.month, month);
    assert.equal(response.body.thisMonth.isCurrentMonth, true);
    assert.equal(response.body.thisMonth.entryCount, 2);
    assert.equal(response.body.thisMonth.averageScore, 3);
    assert.equal(response.body.thisMonth.bestDay.date, `${month}-01`);
    assert.equal(response.body.thisMonth.hardestDay.date, `${month}-02`);
    assert.equal(response.body.thisMonth.daysLogged, 2);
  });

  // US-24
  it('analyses which activities and tags line up with better or worse moods', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();

    await seed(user, [
      { date: addDaysKey(today, -1), mood: 'happy', activities: ['exercise'], tags: ['outdoors'] },
      { date: addDaysKey(today, -2), mood: 'great', activities: ['exercise'], tags: ['outdoors'] },
      { date: addDaysKey(today, -3), mood: 'stressed', activities: ['overtime'], tags: ['deadline'] },
      { date: addDaysKey(today, -4), mood: 'anxious', activities: ['overtime'], tags: ['deadline'] },
    ]);

    const response = await request(port, 'GET', '/api/moods/patterns', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.entryCount, 4);
    assert.equal(response.body.summary.averageScore, 3.5);

    const lifting = response.body.activities.lifting.find((item) => item.value === 'exercise');
    assert.ok(lifting, 'exercise is identified as a lifting activity');
    assert.equal(lifting.averageScore, 5);
    assert.equal(lifting.impact, 1.5);

    const draining = response.body.activities.draining.find((item) => item.value === 'overtime');
    assert.ok(draining, 'overtime is identified as a draining activity');
    assert.equal(draining.impact, -1.5);

    assert.ok(response.body.tags.lifting.some((item) => item.value === 'outdoors'));
    assert.equal(response.body.byDayOfWeek.length, 7);
    assert.equal(response.body.streaks.longestPositive.length, 2);
    assert.equal(response.body.streaks.longestNegative.length, 2);
    assert.ok(response.body.insights.length > 0);
  });

  // US-25
  it('compares the current period against the previous one', async () => {
    const { user, token } = await makeUser();
    const thisWeek = startOfWeekKey();
    const lastWeek = addDaysKey(thisWeek, -7);

    await seed(user, [
      { date: thisWeek, mood: 'calm' },
      { date: lastWeek, mood: 'awful' },
    ]);

    const weekly = await request(port, 'GET', '/api/moods/compare?period=week', { token });
    assert.equal(weekly.status, 200);
    assert.equal(weekly.body.period, 'week');
    assert.equal(weekly.body.current.averageScore, 4);
    assert.equal(weekly.body.previous.averageScore, 1);
    assert.equal(weekly.body.comparison.verdict, 'improved');
    assert.equal(weekly.body.comparison.scoreDelta, 3);

    const custom = await request(
      port,
      'GET',
      `/api/moods/compare?currentStart=${thisWeek}&currentEnd=${addDaysKey(thisWeek, 6)}&previousStart=${lastWeek}&previousEnd=${addDaysKey(lastWeek, 6)}`,
      { token }
    );
    assert.equal(custom.status, 200);
    assert.equal(custom.body.period, 'custom');
    assert.equal(custom.body.comparison.verdict, 'improved');

    const invalid = await request(port, 'GET', '/api/moods/compare?period=decade', { token });
    assert.equal(invalid.status, 400);

    const partial = await request(port, 'GET', '/api/moods/compare?currentStart=2026-01-01', { token });
    assert.equal(partial.status, 400);
  });

  // US-26
  it('generates a mood report with summary, trend, and insights', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();
    await seed(user, [
      { date: today, mood: 'happy', activities: ['yoga'], notes: 'Good session' },
      { date: addDaysKey(today, -3), mood: 'sad', notes: 'Rough day' },
    ]);

    const response = await request(port, 'GET', '/api/moods/reports/summary', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.entryCount, 2);
    assert.equal(response.body.owner.name, user.name);
    assert.ok(response.body.range.start < response.body.range.end);
    assert.ok(Array.isArray(response.body.insights) && response.body.insights.length > 0);
    assert.ok(Array.isArray(response.body.weeks));
    assert.equal(response.body.entries, undefined, 'raw entries stay out of the default payload');

    const withEntries = await request(port, 'GET', '/api/moods/reports/summary?includeEntries=true', { token });
    assert.equal(withEntries.body.entries.length, 2);
  });

  // US-28
  it('exports the mood report as CSV', async () => {
    const { user, token } = await makeUser();
    await seed(user, [{ date: dateKey(), mood: 'grateful', notes: 'Note, with comma', activities: ['walk'] }]);

    const response = await request(port, 'GET', '/api/moods/reports/export?format=csv', { token });

    assert.equal(response.status, 200);
    assert.match(response.contentType, /text\/csv/);
    assert.match(response.body, /CareCircle Mood Report/);
    assert.match(response.body, /Date,Mood,Score,Valence/);
    assert.match(response.body, /grateful/);
    assert.match(response.body, /"Note, with comma"/, 'commas inside a field are quoted');
  });

  // US-27
  it('exports the mood report as a PDF attachment', async () => {
    const { user, token } = await makeUser();
    await seed(user, [{ date: dateKey(), mood: 'calm' }]);

    const response = await request(port, 'GET', '/api/moods/reports/export?format=pdf', { token });

    assert.equal(response.status, 200);
    assert.match(response.contentType, /application\/pdf/);
    assert.ok(Buffer.isBuffer(response.body));
    assert.equal(response.body.subarray(0, 5).toString(), '%PDF-', 'response is a real PDF');
    assert.ok(response.body.length > 800);

    const bad = await request(port, 'GET', '/api/moods/reports/export?format=docx', { token });
    assert.equal(bad.status, 400);
  });

  // US-29
  it('shares a report through an expiring public link that can be revoked', async () => {
    const { user, token } = await makeUser();
    await seed(user, [{ date: dateKey(), mood: 'hopeful', notes: 'Private reflection' }]);

    const created = await request(port, 'POST', '/api/moods/reports/share', {
      token,
      body: { expiresInDays: 3, recipientNote: 'For my therapist' },
    });

    assert.equal(created.status, 201);
    const share = created.body.data;
    assert.ok(share.token);
    assert.match(share.shareUrl, /\/api\/mood-reports\/shared\//);
    assert.equal(share.active, true);
    assert.equal(share.includeNotes, false);

    // The recipient has no CareCircle account, so no token is sent.
    const viewed = await request(port, 'GET', `/api/mood-reports/shared/${share.token}`);
    assert.equal(viewed.status, 200);
    assert.equal(viewed.body.sharedBy, user.name);
    assert.equal(viewed.body.recipientNote, 'For my therapist');
    assert.equal(viewed.body.report.summary.entryCount, 1);
    assert.equal(viewed.body.report.entries[0].notes, undefined, 'notes are withheld unless opted in');

    const sharedPdf = await request(port, 'GET', `/api/mood-reports/shared/${share.token}/export?format=pdf`);
    assert.equal(sharedPdf.status, 200);
    assert.equal(sharedPdf.body.subarray(0, 5).toString(), '%PDF-');

    const listed = await request(port, 'GET', '/api/moods/reports/shares', { token });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.meta.active, 1);
    assert.equal(listed.body.items[0].viewCount, 1, 'views are tracked');

    const revoked = await request(port, 'DELETE', `/api/moods/reports/shares/${share._id}`, { token });
    assert.equal(revoked.status, 200);
    assert.equal(revoked.body.data.active, false);

    const afterRevoke = await request(port, 'GET', `/api/mood-reports/shared/${share.token}`);
    assert.equal(afterRevoke.status, 410);

    const missing = await request(port, 'GET', '/api/mood-reports/shared/not-a-real-token');
    assert.equal(missing.status, 404);
  });

  it('includes notes when the sharer opts in and blocks expired links', async () => {
    const { user, token } = await makeUser();
    await seed(user, [{ date: dateKey(), mood: 'anxious', notes: 'Shared on purpose' }]);

    const created = await request(port, 'POST', '/api/moods/reports/share', {
      token,
      body: { includeNotes: true },
    });
    assert.equal(created.status, 201);

    const viewed = await request(port, 'GET', `/api/mood-reports/shared/${created.body.data.token}`);
    assert.equal(viewed.body.report.entries[0].notes, 'Shared on purpose');

    await MoodReportShare.updateOne(
      { _id: created.body.data._id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const expired = await request(port, 'GET', `/api/mood-reports/shared/${created.body.data.token}`);
    assert.equal(expired.status, 410);

    const badExpiry = await request(port, 'POST', '/api/moods/reports/share', {
      token,
      body: { expiresInDays: 500 },
    });
    assert.equal(badExpiry.status, 400);
  });

  it('keeps one user out of another user report data', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    await seed(owner.user, [{ date: dateKey(), mood: 'happy' }]);

    const created = await request(port, 'POST', '/api/moods/reports/share', { token: owner.token, body: {} });
    const foreignRevoke = await request(port, 'DELETE', `/api/moods/reports/shares/${created.body.data._id}`, {
      token: stranger.token,
    });
    assert.equal(foreignRevoke.status, 404);

    const strangerHistory = await request(port, 'GET', '/api/moods/history', { token: stranger.token });
    assert.equal(strangerHistory.body.summary.entryCount, 0);
  });
});
