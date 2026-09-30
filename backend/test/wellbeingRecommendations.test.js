const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Mood = require('../src/models/Mood');
const Notification = require('../src/models/Notification');
const WellnessActivity = require('../src/models/WellnessActivity');
const wellbeingRoutes = require('../src/routes/wellbeingRoutes');
const { tipFor } = require('../src/services/wellbeingRecommendations');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

const addDaysKey = (key, days) => {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
};

const request = async (port, method, path, { token } = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data };
};

const mount = (app, path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === '') req.url = '/';
    next();
  }, router);
};

describe('personalized wellbeing recommendations', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let userSeq = 0;

  const makeUser = async () => {
    userSeq += 1;
    const user = await User.create({
      name: `Wellbeing Tester ${userSeq}`,
      email: `wellbeing-${userSeq}@carecircle.test`,
      phoneNumber: `+1300000${String(userSeq).padStart(4, '0')}`,
      password: 'password',
    });
    return { user, token: signToken(user) };
  };

  const seedMoods = (user, entries) =>
    Mood.insertMany(
      entries.map((entry) => ({
        userId: user._id,
        date: new Date(`${entry.date}T12:00:00.000Z`),
        mood: entry.mood,
        intensity: entry.intensity,
        activities: entry.activities || [],
      }))
    );

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    mount(app, '/api/wellbeing', wellbeingRoutes);

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

  // US-34
  it('starts with logging guidance when there is no mood history', async () => {
    const { token } = await makeUser();
    const response = await request(port, 'GET', '/api/wellbeing/recommendations', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.tone, 'starting');
    assert.ok(response.body.items.some((item) => item.id === 'start-logging'));
    assert.equal((await request(port, 'GET', '/api/wellbeing/recommendations')).status, 401);
  });

  it('recommends support and helpful activities from a low mood history', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();
    await seedMoods(user, [
      { date: addDaysKey(today, -6), mood: 'anxious', activities: ['walking'] },
      { date: addDaysKey(today, -5), mood: 'sad', activities: ['meetings'] },
      { date: addDaysKey(today, -4), mood: 'anxious', activities: ['walking'] },
      { date: addDaysKey(today, -3), mood: 'overwhelmed', activities: ['meetings'] },
      { date: addDaysKey(today, -2), mood: 'calm', activities: ['walking'] },
      { date: addDaysKey(today, -1), mood: 'sad', activities: ['meetings'] },
    ]);

    const response = await request(port, 'GET', '/api/wellbeing/recommendations?days=14', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.dominantMood, 'anxious');
    assert.ok(['low', 'declining', 'steady'].includes(response.body.tone));
    assert.ok(response.body.items.some((item) => item.id === 'keep-lifting-activity' && item.body.includes('walking')));
    assert.ok(response.body.items.some((item) => item.id === 'ease-draining-activity' && item.body.includes('meetings')));
  });

  it('rejects an invalid history window', async () => {
    const { token } = await makeUser();
    const response = await request(port, 'GET', '/api/wellbeing/recommendations?days=2', { token });
    assert.equal(response.status, 400);
  });

  // US-35
  it('returns the same daily tip all day and stores one notification', async () => {
    const { user, token } = await makeUser();
    const first = await request(port, 'GET', '/api/wellbeing/tips?history=3', { token });
    const second = await request(port, 'GET', '/api/wellbeing/tips', { token });

    assert.equal(first.status, 200);
    assert.equal(first.body.tip.id, second.body.tip.id);
    assert.equal(first.body.tip.id, tipFor(user._id, first.body.date).id);
    assert.equal(first.body.history.length, 3);
    assert.equal(await Notification.countDocuments({ userId: user._id, type: 'daily_wellbeing_tip' }), 1);
  });

  // US-36
  it('matches the motivational message to an improving mood history', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();
    await seedMoods(user, [
      { date: addDaysKey(today, -20), mood: 'sad' },
      { date: addDaysKey(today, -18), mood: 'anxious' },
      { date: addDaysKey(today, -3), mood: 'calm' },
      { date: addDaysKey(today, -2), mood: 'happy' },
      { date: addDaysKey(today, -1), mood: 'grateful' },
      { date: today, mood: 'happy' },
    ]);

    const response = await request(port, 'GET', '/api/wellbeing/motivation', { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.tone, 'improving');
    assert.match(response.body.message.id, /^motivation-up-/);
    assert.equal(await Notification.countDocuments({ userId: user._id, type: 'motivational_message' }), 1);

    await request(port, 'GET', '/api/wellbeing/motivation', { token });
    assert.equal(await Notification.countDocuments({ userId: user._id, type: 'motivational_message' }), 1);
  });

  // US-37
  it('recommends activities from mood history and the current emotional tone', async () => {
    const { user, token } = await makeUser();
    const today = dateKey();
    await seedMoods(user, [
      { date: addDaysKey(today, -4), mood: 'anxious', activities: ['gardening'] },
      { date: addDaysKey(today, -3), mood: 'sad' },
      { date: addDaysKey(today, -2), mood: 'calm', activities: ['gardening'] },
      { date: addDaysKey(today, -1), mood: 'overwhelmed' },
    ]);
    await WellnessActivity.create({
      userId: user._id,
      title: 'Evening stretch',
      category: 'Movement',
      date: new Date(`${today}T00:00:00.000Z`),
      duration: 10,
      targetPerWeek: 3,
    });

    const response = await request(port, 'GET', '/api/wellbeing/activities', { token });
    const stranger = await makeUser();
    const other = await request(port, 'GET', '/api/wellbeing/activities', { token: stranger.token });

    assert.equal(response.status, 200);
    assert.equal(response.body.items[0].source, 'mood_history');
    assert.match(response.body.items[0].title, /Gardening/);
    assert.ok(response.body.items.some((item) => item.source === 'catalog'));
    assert.equal(other.body.items.some((item) => item.title === 'Gardening'), false);
  });
});
