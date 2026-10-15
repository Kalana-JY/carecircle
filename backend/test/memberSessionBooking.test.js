const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_member_session_secret_456';

const User = require('../src/models/User');
const Session = require('../src/models/Session');
const PeerSupporterApplication = require('../src/models/PeerSupporterApplication');
const SessionFeedback = require('../src/models/SessionFeedback');
const sessionRoutes = require('../src/routes/sessionRoutes');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const request = async (port, method, path, { token, body, isBinary = false } = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (isBinary) {
    const arrayBuf = await response.arrayBuffer();
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      disposition: response.headers.get('content-disposition'),
      buffer: Buffer.from(arrayBuf),
    };
  }

  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data };
};

describe('Member Session Booking & History API', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let supporterUser;
  let member1User;
  let member2User;
  let supporterToken;
  let member1Token;
  let member2Token;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });
    await Session.syncIndexes();

    const app = express();
    app.use(express.json());
    app.use('/api/sessions', sessionRoutes);

    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    port = server.address().port;

    // Create Supporter User & Approved Application
    supporterUser = await User.create({
      name: 'Supporter Alex',
      email: 'alex.supporter@carecircle.test',
      phoneNumber: '+10000000010',
      password: 'password123',
    });

    await PeerSupporterApplication.create({
      userId: supporterUser._id,
      name: 'Supporter Alex',
      age: 32,
      address: '10 Peace Road',
      occupation: 'Life Coach & Peer Supporter',
      experiences: '5 years mental health peer support',
      evidence: 'evidence.pdf',
      status: 'approved',
    });

    // Create Member 1
    member1User = await User.create({
      name: 'Emma Watson',
      email: 'emma@carecircle.test',
      phoneNumber: '+10000000011',
      password: 'password123',
    });

    // Create Member 2
    member2User = await User.create({
      name: 'Liam Neeson',
      email: 'liam@carecircle.test',
      phoneNumber: '+10000000012',
      password: 'password123',
    });

    supporterToken = signToken(supporterUser);
    member1Token = signToken(member1User);
    member2Token = signToken(member2User);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('rejects unauthenticated requests to session endpoints', async () => {
    const res = await request(port, 'GET', '/api/sessions');
    assert.equal(res.status, 401);
  });

  it('lists available upcoming sessions from peer supporters for members', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const futureDateEnd = new Date(futureDate.getTime() + 60 * 60 * 1000);

    await Session.create({
      supporterId: supporterUser._id,
      title: 'Stress Management Workshop (1 on 1)',
      description: 'Techniques to de-escalate anxiety and daily stress',
      startTime: futureDate,
      endTime: futureDateEnd,
      sessionType: 'online',
      status: 'available',
    });

    const res = await request(port, 'GET', '/api/sessions', {
      token: member1Token,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    const titles = res.body.items.map((s) => s.title);
    assert.ok(titles.includes('Stress Management Workshop (1 on 1)'));
  });

  it('allows a member to book an available 1-to-1 session slot', async () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sessionToBook = await Session.create({
      supporterId: supporterUser._id,
      title: 'Deep Breath 1-on-1',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 45 * 60 * 1000),
      sessionType: 'online',
      status: 'available',
    });

    const res = await request(port, 'POST', `/api/sessions/${sessionToBook._id}/book`, {
      token: member1Token,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.session.status, 'booked');
    assert.equal(res.body.session.userId.toString(), member1User._id.toString());
  });

  it('prevents a second member from booking the same session slot', async () => {
    const futureDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const bookedSession = await Session.create({
      supporterId: supporterUser._id,
      userId: member1User._id,
      title: 'Already Reserved Slot',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      sessionType: 'online',
      status: 'booked',
    });

    const res = await request(port, 'POST', `/api/sessions/${bookedSession._id}/book`, {
      token: member2Token,
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /no longer available/i);
  });

  it('ensures booked 1-to-1 session is not shown to other users in available sessions list', async () => {
    const res = await request(port, 'GET', '/api/sessions', {
      token: member2Token,
    });

    assert.equal(res.status, 200);
    const titles = res.body.items.map((s) => s.title);
    assert.ok(!titles.includes('Already Reserved Slot'));
  });

  it('lists member active and past bookings via /api/sessions/my-bookings', async () => {
    const res = await request(port, 'GET', '/api/sessions/my-bookings', {
      token: member1Token,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    const titles = res.body.items.map((b) => b.title);
    assert.ok(titles.includes('Deep Breath 1-on-1'));
  });

  it('allows member to cancel their booking and returns slot to available status', async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const sessionToCancel = await Session.create({
      supporterId: supporterUser._id,
      userId: member1User._id,
      title: 'Session to Cancel by Member',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      sessionType: 'online',
      status: 'booked',
    });

    const res = await request(port, 'POST', `/api/sessions/${sessionToCancel._id}/cancel`, {
      token: member1Token,
    });

    assert.equal(res.status, 200);
    const updated = await Session.findById(sessionToCancel._id);
    assert.equal(updated.status, 'available');
    assert.equal(updated.userId, null);
  });

  it('prevents another user from cancelling a session they did not book', async () => {
    const futureDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const privateBooking = await Session.create({
      supporterId: supporterUser._id,
      userId: member1User._id,
      title: 'Private Booking',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      sessionType: 'online',
      status: 'booked',
    });

    const res = await request(port, 'POST', `/api/sessions/${privateBooking._id}/cancel`, {
      token: member2Token,
    });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /unauthorized/i);
  });

  it('allows member to submit rating and feedback for a session', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedSession = await Session.create({
      supporterId: supporterUser._id,
      userId: member1User._id,
      title: 'Completed 1-on-1 Session',
      startTime: pastDate,
      endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
      sessionType: 'online',
      status: 'completed',
    });

    const res = await request(port, 'POST', `/api/sessions/${completedSession._id}/feedback`, {
      token: member1Token,
      body: {
        rating: 5,
        comment: 'Very empathetic and helpful conversation!',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.feedback.rating, 5);
    assert.equal(res.body.feedback.comment, 'Very empathetic and helpful conversation!');
  });

  it('exports member session history as a downloadable PDF (monthly and yearly)', async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Monthly export
    const monthlyRes = await request(
      port,
      'GET',
      `/api/sessions/export-pdf?role=member&period=monthly&year=${currentYear}&month=${currentMonth}`,
      { token: member1Token, isBinary: true }
    );

    assert.equal(monthlyRes.status, 200);
    assert.equal(monthlyRes.contentType, 'application/pdf');
    assert.match(monthlyRes.disposition, /attachment; filename=/);
    assert.ok(monthlyRes.buffer.length > 500);

    // Yearly export
    const yearlyRes = await request(
      port,
      'GET',
      `/api/sessions/export-pdf?role=member&period=yearly&year=${currentYear}`,
      { token: member1Token, isBinary: true }
    );

    assert.equal(yearlyRes.status, 200);
    assert.equal(yearlyRes.contentType, 'application/pdf');
    assert.ok(yearlyRes.buffer.length > 500);
  });
});
