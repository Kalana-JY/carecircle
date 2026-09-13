const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Goal = require('../src/models/Goal');
const GoalHistory = require('../src/models/GoalHistory');
const goalRoutes = require('../src/routes/goalRoutes');
const stepRoutes = require('../src/routes/stepRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');
const achievementRoutes = require('../src/routes/achievementRoutes');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const futureDeadline = '2026-12-31';
const utcDateKey = (value = new Date()) => value.toISOString().slice(0, 10);
const addDaysKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

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
  const data = contentType.includes('text/csv')
    ? await response.text()
    : await response.json().catch(() => ({}));
  return { status: response.status, body: data, contentType };
};

const mount = (app, path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === '') req.url = '/';
    next();
  }, router);
};

const goalBody = (overrides = {}) => ({
  title: 'Walk 5 days a week',
  category: 'fitness',
  target: '20 walks',
  targetValue: 20,
  deadline: futureDeadline,
  ...overrides,
});

describe('goal reminders, steps, reports, and dashboard', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let member;
  let other;
  let memberToken;
  let otherToken;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    mount(app, '/api/goals', goalRoutes);
    mount(app, '/api/steps', stepRoutes);
    mount(app, '/api/notifications', notificationRoutes);
    mount(app, '/api/achievements', achievementRoutes);
    if (typeof stepRoutes.registerRoot === 'function') stepRoutes.registerRoot(app);
    if (typeof notificationRoutes.registerRoot === 'function') notificationRoutes.registerRoot(app);
    if (typeof achievementRoutes.registerRoot === 'function') achievementRoutes.registerRoot(app);

    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    port = server.address().port;

    member = await User.create({
      name: 'Member',
      email: 'goals-plus@carecircle.test',
      phoneNumber: '+10000000021',
      password: 'password',
    });
    other = await User.create({
      name: 'Other',
      email: 'goals-plus-other@carecircle.test',
      phoneNumber: '+10000000022',
      password: 'password',
    });
    memberToken = signToken(member);
    otherToken = signToken(other);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('creates, edits, and cancels a goal reminder', async () => {
    const created = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Journal nightly', category: 'mental-health', target: '14 entries' }),
    });
    assert.equal(created.status, 201);
    const goalId = created.body.data._id;
    const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const createdReminder = await request(port, 'POST', `/api/goals/${goalId}/reminder`, {
      token: memberToken,
      body: { remindAt, frequency: 'daily', message: 'Write tonight' },
    });
    assert.equal(createdReminder.status, 201);
    assert.equal(createdReminder.body.data.frequency, 'daily');
    assert.equal(createdReminder.body.data.status, 'active');

    const duplicate = await request(port, 'POST', `/api/goals/${goalId}/reminder`, {
      token: memberToken,
      body: { remindAt, frequency: 'once' },
    });
    assert.equal(duplicate.status, 409);

    const updated = await request(port, 'PUT', `/api/goals/${goalId}/reminder`, {
      token: memberToken,
      body: { message: 'Five minutes of journaling', frequency: 'weekly' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.message, 'Five minutes of journaling');
    assert.equal(updated.body.data.frequency, 'weekly');

    const denied = await request(port, 'DELETE', `/api/goals/${goalId}/reminder`, { token: otherToken });
    assert.equal(denied.status, 403);

    const cancelled = await request(port, 'DELETE', `/api/goals/${goalId}/reminder`, { token: memberToken });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, 'cancelled');

    const missing = await request(port, 'GET', `/api/goals/${goalId}/reminder`, { token: memberToken });
    assert.equal(missing.status, 404);
  });

  it('notifies when a deadline is approaching or missed', async () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const approaching = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Due soon stretch', category: 'health', target: '3 sessions', deadline: soon }),
    });
    assert.equal(approaching.status, 201);

    await Goal.create({
      userId: member._id,
      title: 'Missed sleep goal',
      category: 'health',
      target: '7 nights',
      deadline: new Date('2020-01-01T00:00:00.000Z'),
      status: 'active',
    });

    const pastReminderGoal = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Remind me now', target: '1 check-in' }),
    });
    await request(port, 'POST', `/api/goals/${pastReminderGoal.body.data._id}/reminder`, {
      token: memberToken,
      body: { remindAt: new Date(Date.now() - 60 * 1000).toISOString(), frequency: 'once', message: 'Check in now' },
    });

    const notifications = await request(port, 'GET', '/api/notifications', { token: memberToken });
    assert.equal(notifications.status, 200);
    const types = notifications.body.data.map((item) => item.type);
    assert.ok(types.includes('deadline_approaching'));
    assert.ok(types.includes('deadline_missed'));
    assert.ok(types.includes('goal_reminder'));
    assert.ok(notifications.body.data.some((item) => item.body.includes('Due soon stretch')));
    assert.ok(notifications.body.data.some((item) => item.body.includes('Missed sleep goal')));
  });

  it('stores step sensor permission and live daily step count', async () => {
    const before = await request(port, 'GET', '/api/steps/permission', { token: memberToken });
    assert.equal(before.status, 200);
    assert.equal(before.body.data.permission, 'undetermined');

    const granted = await request(port, 'POST', '/api/steps/permission', {
      token: memberToken,
      body: { permission: 'granted' },
    });
    assert.equal(granted.status, 200);
    assert.equal(granted.body.data.permission, 'granted');

    const today = await request(port, 'GET', '/api/steps/today', { token: memberToken });
    assert.equal(today.status, 200);
    assert.equal(today.body.data.steps, 0);
    assert.equal(today.body.data.live, true);
  });

  it('auto-updates a step-based goal when steps are synced', async () => {
    const created = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({
        title: 'Hit 10k steps',
        target: '10000 steps',
        targetValue: 10000,
        targetUnit: 'steps',
        trackingType: 'steps',
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.trackingType, 'steps');
    const goalId = created.body.data._id;

    const synced = await request(port, 'POST', '/api/steps', {
      token: memberToken,
      body: { steps: 2500, source: 'sensor' },
    });
    assert.equal(synced.status, 200);
    assert.equal(synced.body.data.steps, 2500);
    assert.ok(synced.body.data.updatedGoals.some((goal) => goal._id === goalId && goal.progress === 25));

    const again = await request(port, 'POST', '/api/steps', {
      token: memberToken,
      body: { steps: 4000 },
    });
    assert.equal(again.body.data.steps, 4000);

    const live = await request(port, 'GET', '/api/steps/today', { token: memberToken });
    assert.equal(live.body.data.steps, 4000);

    const goal = await request(port, 'GET', `/api/goals/${goalId}`, { token: memberToken });
    assert.equal(goal.body.data.progress, 40);
  });

  it('unlocks achievements for completed goals and streaks', async () => {
    const created = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Finish a book', category: 'education', target: '1 book', targetValue: 1 }),
    });
    const goalId = created.body.data._id;

    await request(port, 'PATCH', `/api/goals/${goalId}/status`, {
      token: memberToken,
      body: { status: 'completed' },
    });

    const listed = await request(port, 'GET', '/api/achievements', { token: memberToken });
    assert.equal(listed.status, 200);
    const keys = listed.body.data.unlocked.map((item) => item.key);
    assert.ok(keys.includes('first_goal_created'));
    assert.ok(keys.includes('first_goal_completed'));
    assert.ok(keys.includes('first_step_goal'));
    assert.ok(listed.body.data.catalog.some((item) => item.key === 'streak_7' && item.unlocked === false));
  });

  it('stores goal history and returns week-over-week comparison', async () => {
    const created = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Drink water', category: 'health', target: '14 bottles', targetValue: 14 }),
    });
    const goalId = created.body.data._id;

    await request(port, 'POST', `/api/goals/${goalId}/progress/entries`, {
      token: memberToken,
      body: { value: 4 },
    });

    const history = await request(port, 'GET', `/api/goals/${goalId}/history`, { token: memberToken });
    assert.equal(history.status, 200);
    assert.ok(history.body.count >= 1);
    assert.ok(history.body.data.some((item) => item.progress === 29 || item.source === 'progress' || item.source === 'create'));

    const today = utcDateKey();
    await GoalHistory.create({
      userId: member._id,
      goalId,
      date: addDaysKey(today, -7),
      goalTitle: 'Drink water',
      category: 'health',
      status: 'active',
      progress: 10,
      recordedProgress: 1,
      source: 'snapshot',
    });

    const weekly = await request(port, 'GET', '/api/goals/reports/weekly', { token: memberToken });
    assert.equal(weekly.status, 200);
    assert.ok(weekly.body.data.weekOverWeek.thisWeek);
    assert.ok(weekly.body.data.weekOverWeek.lastWeek);
    assert.equal(weekly.body.data.fourWeekTrend.length, 4);
  });

  it('exports a downloadable CSV progress report', async () => {
    const response = await request(port, 'GET', '/api/goals/reports/export', { token: memberToken });
    assert.equal(response.status, 200);
    assert.match(response.contentType, /text\/csv/);
    assert.match(response.body, /Goal Title/);
    assert.match(response.body, /Drink water|Hit 10k steps|Walk 5 days a week|Journal nightly/);
  });

  it('returns a dashboard summary of active goals, streaks, and completion rate', async () => {
    const response = await request(port, 'GET', '/api/goals/dashboard', { token: memberToken });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.activeGoals);
    assert.equal(typeof response.body.data.completionRate, 'number');
    assert.equal(typeof response.body.data.streaks.current, 'number');
    assert.equal(typeof response.body.data.todaySteps.steps, 'number');
    assert.ok(response.body.data.completionRate > 0);
    assert.ok(Array.isArray(response.body.data.recentAchievements));
  });
});
