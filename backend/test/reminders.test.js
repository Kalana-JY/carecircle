const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Reminder = require('../src/models/Reminder');
const Notification = require('../src/models/Notification');
const reminderRoutes = require('../src/routes/reminderRoutes');
const { computeNextSendAt } = require('../src/services/reminderService');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

const addDaysKey = (key, days) => {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
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
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data };
};

const mount = (app, path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === '') req.url = '/';
    next();
  }, router);
};

describe('wellbeing reminders and notifications', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let userSeq = 0;

  const makeUser = async () => {
    userSeq += 1;
    const user = await User.create({
      name: `Reminder Tester ${userSeq}`,
      email: `reminders-${userSeq}@carecircle.test`,
      phoneNumber: `+1200000${String(userSeq).padStart(4, '0')}`,
      password: 'password',
    });
    return { user, token: signToken(user) };
  };

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    mount(app, '/api/reminders', reminderRoutes);

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

  // US-30
  it('creates daily, weekly, and one-off reminders with a scheduled next send', async () => {
    const { token } = await makeUser();

    const daily = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'mood_log', timeOfDay: '08:30', frequency: 'daily', message: 'Log your mood' },
    });
    assert.equal(daily.status, 201);
    assert.equal(daily.body.data.frequency, 'daily');
    assert.equal(daily.body.data.status, 'active');
    assert.ok(new Date(daily.body.data.nextSendAt) > new Date(), 'next send is in the future');

    const weekly = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'wellness_activity', timeOfDay: '19:00', frequency: 'weekly', daysOfWeek: [1, 4] },
    });
    assert.equal(weekly.status, 201);
    const weeklyDay = new Date(weekly.body.data.nextSendAt).getUTCDay();
    assert.ok([1, 4].includes(weeklyDay), 'weekly reminder lands on a requested weekday');

    const once = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'custom', timeOfDay: '09:00', frequency: 'once', startDate: addDaysKey(dateKey(), 2) },
    });
    assert.equal(once.status, 201);
    assert.equal(once.body.data.nextSendAt.slice(0, 10), addDaysKey(dateKey(), 2));

    // A reminder with no explicit text still carries a usable default.
    assert.equal(weekly.body.data.resolvedTitle, 'Time for your wellbeing activity');
  });

  it('rejects invalid reminder schedules', async () => {
    const { token } = await makeUser();

    const noTime = await request(port, 'POST', '/api/reminders', { token, body: { frequency: 'daily' } });
    assert.equal(noTime.status, 400);

    const badTime = await request(port, 'POST', '/api/reminders', { token, body: { timeOfDay: '25:00' } });
    assert.equal(badTime.status, 400);

    const weeklyNoDays = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '10:00', frequency: 'weekly' },
    });
    assert.equal(weeklyNoDays.status, 400);
    assert.match(weeklyNoDays.body.message, /daysOfWeek/);

    const onceInPast = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '10:00', frequency: 'once', startDate: addDaysKey(dateKey(), -2) },
    });
    assert.equal(onceInPast.status, 400);
    assert.match(onceInPast.body.message, /future/);

    const badType = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '10:00', type: 'telepathy' },
    });
    assert.equal(badType.status, 400);
  });

  it('honours the timezone offset a reminder was created in', async () => {
    // 08:00 in UTC+5:30 is 02:30 UTC.
    const next = computeNextSendAt(
      { frequency: 'daily', timeOfDay: '08:00', utcOffsetMinutes: 330 },
      new Date('2026-03-01T00:00:00.000Z')
    );
    assert.equal(next.toISOString(), '2026-03-01T02:30:00.000Z');

    // Once that moment has passed, the next occurrence rolls to the following day.
    const after = computeNextSendAt(
      { frequency: 'daily', timeOfDay: '08:00', utcOffsetMinutes: 330 },
      new Date('2026-03-01T03:00:00.000Z')
    );
    assert.equal(after.toISOString(), '2026-03-02T02:30:00.000Z');
  });

  // US-31
  it('edits a reminder and reschedules the next send', async () => {
    const { token } = await makeUser();
    const created = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '08:00', frequency: 'daily' },
    });
    const id = created.body.data._id;

    const updated = await request(port, 'PUT', `/api/reminders/${id}`, {
      token,
      body: { timeOfDay: '21:15', message: 'Evening check-in', frequency: 'weekly', daysOfWeek: [3] },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.timeOfDay, '21:15');
    assert.equal(updated.body.data.message, 'Evening check-in');
    assert.equal(updated.body.data.frequency, 'weekly');
    assert.deepEqual(updated.body.data.daysOfWeek, [3]);
    assert.equal(new Date(updated.body.data.nextSendAt).getUTCDay(), 3);

    const empty = await request(port, 'PUT', `/api/reminders/${id}`, { token, body: {} });
    assert.equal(empty.status, 400);

    const badTime = await request(port, 'PUT', `/api/reminders/${id}`, { token, body: { timeOfDay: '9am' } });
    assert.equal(badTime.status, 400);
  });

  it('pauses and resumes a reminder', async () => {
    const { token } = await makeUser();
    const created = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '07:00', frequency: 'daily' },
    });
    const id = created.body.data._id;

    const paused = await request(port, 'PATCH', `/api/reminders/${id}/status`, { token, body: { status: 'paused' } });
    assert.equal(paused.status, 200);
    assert.equal(paused.body.data.status, 'paused');
    assert.equal(paused.body.data.nextSendAt, null);

    const resumed = await request(port, 'PATCH', `/api/reminders/${id}/status`, { token, body: { status: 'active' } });
    assert.equal(resumed.status, 200);
    assert.equal(resumed.body.data.status, 'active');
    assert.ok(new Date(resumed.body.data.nextSendAt) > new Date());

    const invalid = await request(port, 'PATCH', `/api/reminders/${id}/status`, { token, body: { status: 'deleted' } });
    assert.equal(invalid.status, 400);
  });

  // US-32
  it('deletes a reminder and stops it from firing again', async () => {
    const { token } = await makeUser();
    const created = await request(port, 'POST', '/api/reminders', {
      token,
      body: { timeOfDay: '06:45', frequency: 'daily' },
    });
    const id = created.body.data._id;

    const deleted = await request(port, 'DELETE', `/api/reminders/${id}`, { token });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.data.status, 'cancelled');
    assert.equal(deleted.body.data.nextSendAt, null);

    const listed = await request(port, 'GET', '/api/reminders', { token });
    assert.equal(listed.body.items.length, 0, 'cancelled reminders are hidden by default');

    const includingCancelled = await request(port, 'GET', '/api/reminders?status=cancelled', { token });
    assert.equal(includingCancelled.body.items.length, 1);

    const editAfterDelete = await request(port, 'PUT', `/api/reminders/${id}`, { token, body: { timeOfDay: '10:00' } });
    assert.equal(editAfterDelete.status, 409);
  });

  it('blocks access to another user reminders', async () => {
    const owner = await makeUser();
    const stranger = await makeUser();

    const created = await request(port, 'POST', '/api/reminders', {
      token: owner.token,
      body: { timeOfDay: '12:00', frequency: 'daily' },
    });
    const id = created.body.data._id;

    assert.equal((await request(port, 'GET', `/api/reminders/${id}`, { token: stranger.token })).status, 403);
    assert.equal((await request(port, 'DELETE', `/api/reminders/${id}`, { token: stranger.token })).status, 403);
    assert.equal((await request(port, 'GET', '/api/reminders/not-an-id', { token: owner.token })).status, 400);
    assert.equal((await request(port, 'GET', `/api/reminders/${id}`)).status, 401);
  });

  // US-33
  it('delivers a notification when a reminder falls due', async () => {
    const { user, token } = await makeUser();
    const created = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'mood_log', timeOfDay: '08:00', frequency: 'daily', message: 'How are you feeling?' },
    });
    const id = created.body.data._id;

    // Pull the schedule into the past so the next sync treats it as due.
    await Reminder.updateOne({ _id: id }, { $set: { nextSendAt: new Date(Date.now() - 60 * 1000) } });

    const inbox = await request(port, 'GET', '/api/reminders/notifications', { token });

    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.items.length, 1);
    assert.equal(inbox.body.items[0].type, 'mood_log_reminder');
    assert.equal(inbox.body.items[0].body, 'How are you feeling?');
    assert.equal(inbox.body.items[0].read, false);
    assert.equal(inbox.body.meta.unreadCount, 1);
    assert.equal(String(inbox.body.items[0].metadata.reminderId), id);

    // A daily reminder keeps going with a freshly scheduled occurrence.
    const reminder = await Reminder.findById(id);
    assert.equal(reminder.status, 'active');
    assert.equal(reminder.occurrenceCount, 1);
    assert.ok(reminder.nextSendAt > new Date());

    // Re-syncing must not duplicate the same occurrence.
    await request(port, 'GET', '/api/reminders/notifications', { token });
    assert.equal(await Notification.countDocuments({ userId: user._id }), 1);
  });

  it('completes a one-off reminder after it fires and skips paused ones', async () => {
    const { token } = await makeUser();

    const once = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'custom', timeOfDay: '09:00', frequency: 'once', startDate: addDaysKey(dateKey(), 1) },
    });
    await Reminder.updateOne(
      { _id: once.body.data._id },
      { $set: { nextSendAt: new Date(Date.now() - 60 * 1000) } }
    );

    const paused = await request(port, 'POST', '/api/reminders', {
      token,
      body: { type: 'custom', timeOfDay: '10:00', frequency: 'daily', message: 'Should stay quiet' },
    });
    await request(port, 'PATCH', `/api/reminders/${paused.body.data._id}/status`, {
      token,
      body: { status: 'paused' },
    });

    const inbox = await request(port, 'GET', '/api/reminders/notifications', { token });

    assert.equal(inbox.body.items.length, 1, 'only the due reminder notifies');
    assert.equal(inbox.body.items[0].type, 'custom_reminder');

    const settled = await Reminder.findById(once.body.data._id);
    assert.equal(settled.status, 'completed');
    assert.equal(settled.nextSendAt, null);
  });
});
