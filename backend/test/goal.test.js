const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Goal = require('../src/models/Goal');
const goalRoutes = require('../src/routes/goalRoutes');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const futureDeadline = '2026-12-31';
const laterDeadline = '2027-06-15';

const request = async (port, method, path, { token, body } = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data };
};

const goalBody = (overrides = {}) => ({
  title: 'Walk 5 days a week',
  category: 'fitness',
  target: '20 walks',
  targetValue: 20,
  deadline: futureDeadline,
  ...overrides,
});

describe('goal management API', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let member;
  let other;
  let memberToken;
  let otherToken;
  let createdGoalId;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    app.use('/api/goals', goalRoutes);
    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    port = server.address().port;

    member = await User.create({
      name: 'Member',
      email: 'member@carecircle.test',
      phoneNumber: '+10000000011',
      password: 'password',
    });
    other = await User.create({
      name: 'Other',
      email: 'other@carecircle.test',
      phoneNumber: '+10000000012',
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

  it('rejects unauthenticated goal requests', async () => {
    const response = await request(port, 'GET', '/api/goals');
    assert.equal(response.status, 401);
  });

  it('creates a goal with title, category, target, and deadline', async () => {
    const response = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ description: 'Build a walking habit' }),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.title, 'Walk 5 days a week');
    assert.equal(response.body.data.category, 'fitness');
    assert.equal(response.body.data.target, '20 walks');
    assert.equal(response.body.data.status, 'active');
    assert.equal(response.body.data.progress, 0);
    createdGoalId = response.body.data._id;
  });

  it('requires title, category, target, and a future deadline', async () => {
    const missing = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: { title: 'Incomplete' },
    });
    assert.equal(missing.status, 400);

    const past = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Late goal', deadline: '2020-01-01' }),
    });
    assert.equal(past.status, 400);
    assert.match(past.body.message || '', /future/i);
  });

  it('lists only the current user goals and filters by status', async () => {
    await request(port, 'POST', '/api/goals', {
      token: otherToken,
      body: goalBody({ title: 'Other user goal', category: 'career', target: 'Finish a course' }),
    });

    const overdueGoal = await Goal.create({
      userId: member._id,
      title: 'Overdue stretching',
      category: 'health',
      target: '10 sessions',
      deadline: new Date('2020-01-01T00:00:00.000Z'),
      status: 'active',
    });
    assert.equal(overdueGoal.status, 'overdue');

    const all = await request(port, 'GET', '/api/goals', { token: memberToken });
    assert.equal(all.status, 200);
    assert.equal(all.body.data.some((goal) => goal.title === 'Other user goal'), false);
    assert.ok(all.body.data.some((goal) => goal._id === createdGoalId));

    const active = await request(port, 'GET', '/api/goals?status=active', { token: memberToken });
    assert.ok(active.body.data.every((goal) => ['active', 'in_progress'].includes(goal.status)));
    assert.ok(active.body.data.some((goal) => goal._id === createdGoalId));
    assert.equal(active.body.data.some((goal) => goal._id === String(overdueGoal._id)), false);

    const overdue = await request(port, 'GET', '/api/goals?status=overdue', { token: memberToken });
    assert.ok(overdue.body.data.some((goal) => goal._id === String(overdueGoal._id)));
    assert.ok(overdue.body.data.every((goal) => goal.status === 'overdue'));
  });

  it('updates an existing goal details', async () => {
    const response = await request(port, 'PUT', `/api/goals/${createdGoalId}`, {
      token: memberToken,
      body: {
        title: 'Walk 6 days a week',
        category: 'health',
        target: '24 walks',
        targetValue: 24,
        deadline: laterDeadline,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.title, 'Walk 6 days a week');
    assert.equal(response.body.data.category, 'health');
    assert.equal(response.body.data.target, '24 walks');
    assert.equal(response.body.data.targetValue, 24);
  });

  it('does not let another user update or view a private goal', async () => {
    const viewed = await request(port, 'GET', `/api/goals/${createdGoalId}`, { token: otherToken });
    assert.equal(viewed.status, 403);

    const updated = await request(port, 'PUT', `/api/goals/${createdGoalId}`, {
      token: otherToken,
      body: { title: 'Hacked' },
    });
    assert.equal(updated.status, 403);
  });

  it('logs progress entries and updates completion percentage', async () => {
    const first = await request(port, 'POST', `/api/goals/${createdGoalId}/progress/entries`, {
      token: memberToken,
      body: { value: 6, note: 'Week 1 walks' },
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.completionPercentage, 25);
    assert.equal(first.body.data.progress, 25);
    assert.equal(first.body.data.progressEntries.length, 1);

    const second = await request(port, 'POST', `/api/goals/${createdGoalId}/progress/entries`, {
      token: memberToken,
      body: { value: 18 },
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.completionPercentage, 100);
    assert.equal(second.body.data.status, 'completed');
  });

  it('updates a goal status to in_progress, paused, or completed', async () => {
    const pausedGoal = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Meditate daily', category: 'mental-health', target: '30 sessions', targetValue: 30 }),
    });
    const goalId = pausedGoal.body.data._id;

    const inProgress = await request(port, 'PATCH', `/api/goals/${goalId}/status`, {
      token: memberToken,
      body: { status: 'in_progress' },
    });
    assert.equal(inProgress.status, 200);
    assert.equal(inProgress.body.data.status, 'in_progress');

    const paused = await request(port, 'PATCH', `/api/goals/${goalId}/status`, {
      token: memberToken,
      body: { status: 'paused' },
    });
    assert.equal(paused.status, 200);
    assert.equal(paused.body.data.status, 'paused');

    const completed = await request(port, 'PATCH', `/api/goals/${goalId}/status`, {
      token: memberToken,
      body: { status: 'completed' },
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data.status, 'completed');
    assert.equal(completed.body.data.progress, 100);

    const listed = await request(port, 'GET', '/api/goals?status=completed', { token: memberToken });
    assert.ok(listed.body.data.some((goal) => goal._id === goalId));

    const invalid = await request(port, 'PATCH', `/api/goals/${goalId}/status`, {
      token: memberToken,
      body: { status: 'overdue' },
    });
    assert.equal(invalid.status, 400);
  });

  it('deletes a goal owned by the current user', async () => {
    const created = await request(port, 'POST', '/api/goals', {
      token: memberToken,
      body: goalBody({ title: 'Temporary goal', target: '1 check-in' }),
    });
    const goalId = created.body.data._id;

    const denied = await request(port, 'DELETE', `/api/goals/${goalId}`, { token: otherToken });
    assert.equal(denied.status, 403);

    const deleted = await request(port, 'DELETE', `/api/goals/${goalId}`, { token: memberToken });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.success, true);

    const missing = await request(port, 'GET', `/api/goals/${goalId}`, { token: memberToken });
    assert.equal(missing.status, 404);
  });
});

describe('goal model', () => {
  it('requires title, category, target, and deadline', async () => {
    const goal = new Goal({ userId: new mongoose.Types.ObjectId() });
    const error = await goal.validate().catch((validationError) => validationError);
    assert.ok(error.errors.title);
    assert.ok(error.errors.category);
    assert.ok(error.errors.target);
    assert.ok(error.errors.deadline);
  });

  it('recalculates completion percentage from progress entries', async () => {
    const goal = new Goal({
      userId: new mongoose.Types.ObjectId(),
      title: 'Read more',
      category: 'education',
      target: '10 books',
      targetValue: 10,
      deadline: new Date('2026-12-31T23:59:59.999Z'),
    });
    goal.progressEntries.push({ value: 4 });
    goal.recalculateProgress();
    assert.equal(goal.progress, 40);
    assert.notEqual(goal.status, 'completed');

    goal.progressEntries.push({ value: 6 });
    goal.recalculateProgress();
    assert.equal(goal.progress, 100);
    assert.equal(goal.status, 'completed');
  });
});
