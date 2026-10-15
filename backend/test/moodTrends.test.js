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
const journalRoutes = require('../src/routes/journalRoutes');
const wellnessActivityRoutes = require('../src/routes/wellnessActivityRoutes');
const WellnessActivity = require('../src/models/WellnessActivity');

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
    mount(app, '/api/journals', journalRoutes);
    mount(app, '/api/wellness-activities', wellnessActivityRoutes);

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
    assert.equal(viewed.body.report.owner.email, undefined, 'the share link does not expose the owner email');

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

  it('scores Radiant, Steady, Cloudy, Heavy, and Stormy on the 5 to 1 scale', async () => {
    const { user, token } = await makeUser();
    await seed(user, [
      { date: '2026-04-06', mood: 'Radiant' },
      { date: '2026-04-07', mood: 'Steady' },
      { date: '2026-04-08', mood: 'Cloudy' },
      { date: '2026-04-09', mood: 'Heavy' },
      { date: '2026-04-10', mood: 'Stormy' },
    ]);

    const response = await request(port, 'GET', '/api/moods/history?start=2026-04-06&end=2026-04-10&today=2026-04-10', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.entryCount, 5);
    assert.equal(response.body.summary.averageScore, 3);
    const scores = Object.fromEntries(response.body.items.map((item) => [item.mood, item.score]));
    assert.deepEqual(scores, { Radiant: 5, Steady: 4, Cloudy: 3, Heavy: 2, Stormy: 1 });
  });

  it('keeps one mood per user per day and still scores older mood words', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const day = '2026-05-04';

    await seed(owner.user, [
      { date: day, mood: 'happy', notes: 'older duplicate' },
      { date: day, mood: 'sad', notes: 'later duplicate' },
    ]);

    const created = await request(port, 'POST', '/api/moods', {
      token: owner.token,
      body: { date: day, mood: 'Radiant', notes: 'settled' },
    });
    assert.equal(created.status, 200);
    assert.equal(created.body.updatedExisting, true);
    assert.equal(created.body.mood, 'Radiant');

    const changed = await request(port, 'POST', '/api/moods', {
      token: owner.token,
      body: { date: day, mood: 'Heavy', notes: 'changed my mind' },
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body._id, created.body._id);

    const other = await request(port, 'POST', '/api/moods', {
      token: stranger.token,
      body: { date: day, mood: 'Steady' },
    });
    assert.equal(other.status, 201);

    const history = await request(port, 'GET', `/api/moods/history?start=${day}&end=${day}&today=${day}`, { token: owner.token });
    assert.equal(history.body.summary.entryCount, 1);
    assert.equal(history.body.items[0].mood, 'Heavy');
    assert.equal(history.body.items[0].score, 2);
    assert.equal(history.body.items[0].notes, 'changed my mind');

    const hidden = await request(port, 'GET', `/api/moods/${created.body._id}`, { token: stranger.token });
    assert.equal(hidden.status, 404);

    const legacy = await request(port, 'POST', '/api/moods', {
      token: owner.token,
      body: { date: '2026-05-05', mood: 'happy' },
    });
    assert.equal(legacy.status, 201);
    const legacyHistory = await request(port, 'GET', '/api/moods/history?start=2026-05-05&end=2026-05-05&today=2026-05-05', {
      token: owner.token,
    });
    assert.equal(legacyHistory.body.items[0].score, 5);
  });

  it('builds a Monday to Sunday week from the client calendar day', async () => {
    const { user, token } = await makeUser();
    await seed(user, [
      { date: '2026-04-06', mood: 'Radiant' },
      { date: '2026-04-07', mood: 'Steady' },
      { date: '2026-04-08', mood: 'Cloudy' },
      { date: '2026-04-12', mood: 'Stormy' },
    ]);

    const response = await request(port, 'GET', '/api/moods/trends/weekly?weeks=1&today=2026-04-08', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.thisWeek.weekStart, '2026-04-06');
    assert.equal(response.body.thisWeek.weekEnd, '2026-04-12');
    assert.equal(response.body.thisWeek.days.length, 7);
    assert.equal(response.body.thisWeek.days[0].dayOfWeek, 'Monday');
    assert.equal(response.body.thisWeek.days[0].date, '2026-04-06');
    assert.equal(response.body.thisWeek.days[0].averageScore, 5);
    assert.equal(response.body.thisWeek.days[6].dayOfWeek, 'Sunday');
    assert.equal(response.body.thisWeek.days[6].date, '2026-04-12');
    assert.equal(response.body.thisWeek.days[6].averageScore, 1);
    assert.equal(response.body.thisWeek.averageScore, 3.25);
    assert.equal(response.body.recordingStreak.length, 3);
    assert.equal(response.body.recordingStreak.includesToday, true);

    const badToday = await request(port, 'GET', '/api/moods/trends/weekly?today=2026-04-31', { token });
    assert.equal(badToday.status, 400);
  });

  it('rejects invalid mood input and scores an unknown label as neutral', async () => {
    const { token } = await makeUser();

    const missing = await request(port, 'POST', '/api/moods', { token, body: { date: '2026-06-01', mood: '   ' } });
    assert.equal(missing.status, 400);

    const badIntensity = await request(port, 'POST', '/api/moods', {
      token,
      body: { date: '2026-06-01', mood: 'Cloudy', intensity: 99 },
    });
    assert.equal(badIntensity.status, 400);

    const unknown = await request(port, 'POST', '/api/moods', {
      token,
      body: { date: '2026-06-02', mood: 'bewildered' },
    });
    assert.equal(unknown.status, 201);

    const history = await request(port, 'GET', '/api/moods/history?start=2026-06-02&end=2026-06-02&today=2026-06-02', { token });
    assert.equal(history.body.items[0].score, 3);
    assert.equal(history.body.items[0].valence, 'neutral');
  });

  it('summarises only the signed-in user wellbeing logs for the current week', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();

    await WellnessActivity.create({
      userId: owner.user._id,
      title: 'Evening walk',
      category: 'Movement',
      date: new Date('2026-04-06T12:00:00.000Z'),
      duration: 20,
      targetPerWeek: 3,
      logs: [
        { date: new Date('2026-04-06T12:00:00.000Z'), minutes: 20 },
        { date: new Date('2026-04-08T12:00:00.000Z'), minutes: 15 },
        { date: new Date('2026-04-07T12:00:00.000Z'), minutes: 0 },
        { date: new Date('2026-03-30T12:00:00.000Z'), minutes: 20 },
      ],
    });
    await WellnessActivity.create({
      userId: stranger.user._id,
      title: 'Private stretch',
      category: 'Calm',
      date: new Date('2026-04-06T12:00:00.000Z'),
      duration: 10,
      targetPerWeek: 2,
      logs: [{ date: new Date('2026-04-06T12:00:00.000Z'), minutes: 10 }],
    });

    const summary = await request(port, 'GET', '/api/wellness-activities/summary?today=2026-04-08', { token: owner.token });
    assert.equal(summary.status, 200);
    assert.equal(summary.body.weekStart, '2026-04-06');
    assert.equal(summary.body.weekEnd, '2026-04-12');
    assert.equal(summary.body.loggedDays, 2);
    assert.equal(summary.body.targetDays, 3);
    assert.equal(summary.body.items.length, 1);
    assert.equal(summary.body.items[0].title, 'Evening walk');

    const hidden = await request(port, 'GET', '/api/wellness-activities/summary?today=2026-04-08', { token: stranger.token });
    assert.equal(hidden.body.loggedDays, 1);
    assert.equal(hidden.body.items[0].title, 'Private stretch');
  });

  it('stops one user from updating or exporting another user mood data', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const day = '2026-07-01';
    await seed(owner.user, [{ date: day, mood: 'Stormy', notes: 'Owner only note' }]);
    await seed(stranger.user, [{ date: day, mood: 'Radiant', notes: 'Stranger private note' }]);

    const listed = await request(port, 'GET', '/api/moods', { token: owner.token });
    const ownId = listed.body.items[0]._id;

    const foreignUpdate = await request(port, 'PATCH', `/api/moods/${ownId}`, {
      token: stranger.token,
      body: { mood: 'Radiant', notes: 'Taken over' },
    });
    assert.equal(foreignUpdate.status, 404);

    const csv = await request(port, 'GET', `/api/moods/reports/export?format=csv&start=${day}&end=${day}&today=${day}`, {
      token: owner.token,
    });
    assert.equal(csv.status, 200);
    assert.match(csv.body, /Stormy,1,/);
    assert.equal(csv.body.includes('Stranger private note'), false);
    assert.equal(csv.body.includes('Radiant'), false);
  });

  it('keeps journal entries private to the author', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();

    const created = await request(port, 'POST', '/api/journals', {
      token: owner.token,
      body: { date: '2026-04-08', body: 'A private page', mood: 'Cloudy' },
    });
    assert.equal(created.status, 201);

    const ownList = await request(port, 'GET', '/api/journals', { token: owner.token });
    assert.equal(ownList.body.meta.total, 1);
    assert.equal(ownList.body.items[0].body, 'A private page');

    const foreignList = await request(port, 'GET', '/api/journals', { token: stranger.token });
    assert.equal(foreignList.body.meta.total, 0);

    const foreignRead = await request(port, 'GET', `/api/journals/${created.body._id}`, { token: stranger.token });
    assert.equal(foreignRead.status, 404);

    const badDate = await request(port, 'POST', '/api/journals', {
      token: owner.token,
      body: { date: '2026-02-31', body: 'Impossible day' },
    });
    assert.equal(badDate.status, 400);
  });
});
