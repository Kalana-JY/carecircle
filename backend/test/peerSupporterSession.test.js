const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_session_secret_123';

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

describe('Peer Supporter Sessions & Schedule API', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let supporterUser;
  let nonSupporterUser;
  let memberUser;
  let supporterToken;
  let nonSupporterToken;
  let memberToken;

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
      name: 'Supporter Sarah',
      email: 'sarah.supporter@carecircle.test',
      phoneNumber: '+10000000001',
      password: 'password123',
    });

    await PeerSupporterApplication.create({
      userId: supporterUser._id,
      name: 'Supporter Sarah',
      age: 29,
      address: '77 Wellness Way',
      occupation: 'Peer Counselor',
      experiences: 'Over 4 years active community peer support',
      evidence: 'credential.pdf',
      status: 'approved',
    });

    // Create Non-supporter User (e.g. general member)
    nonSupporterUser = await User.create({
      name: 'Regular Ryan',
      email: 'ryan@carecircle.test',
      phoneNumber: '+10000000002',
      password: 'password123',
    });

    // Create Member User who will book
    memberUser = await User.create({
      name: 'Member Mark',
      email: 'mark@carecircle.test',
      phoneNumber: '+10000000003',
      password: 'password123',
    });

    supporterToken = signToken(supporterUser);
    nonSupporterToken = signToken(nonSupporterUser);
    memberToken = signToken(memberUser);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('rejects session slot creation if user is not an approved peer supporter', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTomorrow = new Date(tomorrow.getTime() + 60 * 60 * 1000);

    const res = await request(port, 'POST', '/api/sessions', {
      token: nonSupporterToken,
      body: {
        title: 'Unauthorized Session Slot',
        startTime: tomorrow.toISOString(),
        endTime: endTomorrow.toISOString(),
        sessionType: 'online',
      },
    });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /certified peer supporters/i);
  });

  it('lets an approved supporter create online and physical session slots', async () => {
    const futureDate1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const futureDate1End = new Date(futureDate1.getTime() + 45 * 60 * 1000);

    // 1. Online session
    const onlineRes = await request(port, 'POST', '/api/sessions', {
      token: supporterToken,
      body: {
        title: 'Mindfulness & Active Listening',
        description: 'One on one coping strategies check-in',
        startTime: futureDate1.toISOString(),
        endTime: futureDate1End.toISOString(),
        sessionType: 'online',
      },
    });

    assert.equal(onlineRes.status, 201);
    assert.equal(onlineRes.body.session.title, 'Mindfulness & Active Listening');
    assert.equal(onlineRes.body.session.sessionType, 'online');
    assert.equal(onlineRes.body.session.status, 'available');
    assert.ok(onlineRes.body.session.meetingLink);

    // 2. Physical session
    const futureDate2 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const futureDate2End = new Date(futureDate2.getTime() + 60 * 60 * 1000);

    const physicalRes = await request(port, 'POST', '/api/sessions', {
      token: supporterToken,
      body: {
        title: 'In-Person Coffee & Check-in',
        description: 'Casual face to face emotional support',
        startTime: futureDate2.toISOString(),
        endTime: futureDate2End.toISOString(),
        sessionType: 'physical',
        venue: 'Room 204, Downtown Community Health Center',
      },
    });

    assert.equal(physicalRes.status, 201);
    assert.equal(physicalRes.body.session.sessionType, 'physical');
    assert.equal(physicalRes.body.session.venue, 'Room 204, Downtown Community Health Center');
  });

  it('validates start time must be in the future and end time after start time', async () => {
    const pastStart = new Date(Date.now() - 3600000);
    const pastEnd = new Date(Date.now() - 1800000);

    const res = await request(port, 'POST', '/api/sessions', {
      token: supporterToken,
      body: {
        title: 'Past Invalid Session',
        startTime: pastStart.toISOString(),
        endTime: pastEnd.toISOString(),
        sessionType: 'online',
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /must be in the future/i);
  });

  it('returns supporter schedule and correctly groups active sessions', async () => {
    const res = await request(port, 'GET', '/api/sessions/my-schedule', {
      token: supporterToken,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.ok(res.body.items.length >= 2);

    const titles = res.body.items.map((s) => s.title);
    assert.ok(titles.includes('Mindfulness & Active Listening'));
    assert.ok(titles.includes('In-Person Coffee & Check-in'));
  });

  it('allows supporter to update session slot details', async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const futureDateEnd = new Date(futureDate.getTime() + 60 * 60 * 1000);

    const created = await Session.create({
      supporterId: supporterUser._id,
      title: 'Original Title To Update',
      description: 'Original description',
      startTime: futureDate,
      endTime: futureDateEnd,
      sessionType: 'online',
      status: 'available',
    });

    const updateRes = await request(port, 'PUT', `/api/sessions/${created._id}`, {
      token: supporterToken,
      body: {
        title: 'Updated Resilience Session',
        description: 'New updated description',
        sessionType: 'online',
        startTime: futureDate.toISOString(),
        endTime: futureDateEnd.toISOString(),
      },
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.session.title, 'Updated Resilience Session');
    assert.equal(updateRes.body.session.description, 'New updated description');
  });

  it('prevents supporter from editing a booked session scheduled within 12 hours', async () => {
    const nearFuture = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours away (< 12 hours)
    const nearFutureEnd = new Date(nearFuture.getTime() + 60 * 60 * 1000);

    const bookedNearSession = await Session.create({
      supporterId: supporterUser._id,
      userId: memberUser._id,
      title: 'Near Booked Session',
      startTime: nearFuture,
      endTime: nearFutureEnd,
      sessionType: 'online',
      status: 'booked',
    });

    const res = await request(port, 'PUT', `/api/sessions/${bookedNearSession._id}`, {
      token: supporterToken,
      body: {
        title: 'Attempted Change',
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /within 12 hours/i);
  });

  it('allows supporter to cancel a session slot', async () => {
    const futureDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    const sessionToCancel = await Session.create({
      supporterId: supporterUser._id,
      userId: memberUser._id,
      title: 'Session to be cancelled by host',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 3600000),
      sessionType: 'online',
      status: 'booked',
    });

    const res = await request(port, 'POST', `/api/sessions/${sessionToCancel._id}/cancel`, {
      token: supporterToken,
    });

    assert.equal(res.status, 200);
    const updated = await Session.findById(sessionToCancel._id);
    assert.equal(updated.status, 'cancelled');
  });

  it('allows supporter to delete an unbooked session slot', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionToDelete = await Session.create({
      supporterId: supporterUser._id,
      title: 'Slot to Delete',
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 3600000),
      sessionType: 'online',
      status: 'available',
    });

    const res = await request(port, 'DELETE', `/api/sessions/${sessionToDelete._id}`, {
      token: supporterToken,
    });

    assert.equal(res.status, 200);
    const found = await Session.findById(sessionToDelete._id);
    assert.equal(found, null);
  });

  it('returns feedback metrics and summary for the peer supporter', async () => {
    const pastDate = new Date(Date.now() - 48 * 3600000);
    const completedSession = await Session.create({
      supporterId: supporterUser._id,
      userId: memberUser._id,
      title: 'Completed Reflection Session',
      startTime: pastDate,
      endTime: new Date(pastDate.getTime() + 3600000),
      sessionType: 'online',
      status: 'completed',
    });

    await SessionFeedback.create({
      sessionId: completedSession._id,
      supporterId: supporterUser._id,
      userId: memberUser._id,
      rating: 5,
      comment: 'Incredible guidance and compassion! Thank you Sarah.',
      sessionTitle: completedSession.title,
      sessionType: 'online',
    });

    const res = await request(port, 'GET', '/api/sessions/my-feedback', {
      token: supporterToken,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.feedbacks.length >= 1);
    assert.equal(res.body.summary.averageRating, 5);
    assert.equal(res.body.summary.totalFeedbacks, 1);
    assert.equal(res.body.summary.ratingBreakdown['5'], 1);
  });

  it('exports supporter past sessions log as a downloadable PDF (monthly and yearly)', async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Monthly export
    const monthlyRes = await request(
      port,
      'GET',
      `/api/sessions/export-pdf?role=supporter&period=monthly&year=${currentYear}&month=${currentMonth}`,
      { token: supporterToken, isBinary: true }
    );

    assert.equal(monthlyRes.status, 200);
    assert.equal(monthlyRes.contentType, 'application/pdf');
    assert.match(monthlyRes.disposition, /attachment; filename=/);
    assert.ok(monthlyRes.buffer.length > 500);

    // Yearly export
    const yearlyRes = await request(
      port,
      'GET',
      `/api/sessions/export-pdf?role=supporter&period=yearly&year=${currentYear}`,
      { token: supporterToken, isBinary: true }
    );

    assert.equal(yearlyRes.status, 200);
    assert.equal(yearlyRes.contentType, 'application/pdf');
    assert.ok(yearlyRes.buffer.length > 500);
  });
});
