const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.ADMIN_EMAIL = 'admin@carecircle.test';
process.env.JWT_SECRET = 'test_secret';
process.env.CRISIS_EMERGENCY_NUMBER = '119';

const User = require('../src/models/User');
const CrisisSupportEntry = require('../src/models/CrisisSupportEntry');
const crisisSupportRoutes = require('../src/routes/crisisSupportRoutes');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

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

describe('crisis support directory API', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let adminToken;
  let memberToken;
  let hospital;
  let counselor;
  let organization;
  let helpline;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });
    await CrisisSupportEntry.syncIndexes();

    const app = express();
    app.use(express.json());
    app.use('/api/crisis-support', crisisSupportRoutes);
    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    port = server.address().port;

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@carecircle.test',
      phoneNumber: '+10000000021',
      password: 'password',
    });
    const member = await User.create({
      name: 'Member',
      email: 'crisis-member@carecircle.test',
      phoneNumber: '+10000000022',
      password: 'password',
    });
    adminToken = signToken(admin);
    memberToken = signToken(member);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('rejects directory creation from a non-admin user', async () => {
    const response = await request(port, 'POST', '/api/crisis-support', {
      token: memberToken,
      body: { name: 'Blocked Hospital', type: 'hospital', phone: '0112691111' },
    });
    assert.equal(response.status, 403);
  });

  it('lets an admin add hospitals, counselors, organizations, and helplines', async () => {
    const hospitalRes = await request(port, 'POST', '/api/crisis-support', {
      token: adminToken,
      body: {
        name: 'National Hospital of Sri Lanka',
        type: 'hospital',
        phone: '0112691111',
        address: 'Regent Street, Colombo 10',
        city: 'Colombo',
        latitude: 6.9271,
        longitude: 79.8612,
        services: ['emergency', 'psychiatry'],
      },
    });
    assert.equal(hospitalRes.status, 201);
    hospital = hospitalRes.body.entry;
    assert.equal(hospital.type, 'hospital');
    assert.equal(hospital.latitude, 6.9271);

    const counselorRes = await request(port, 'POST', '/api/crisis-support', {
      token: adminToken,
      body: {
        name: 'Colombo Counseling Center',
        type: 'counselor',
        phone: '0112555000',
        address: 'Bambalapitiya, Colombo 4',
        city: 'Colombo',
        latitude: 6.8930,
        longitude: 79.8550,
      },
    });
    assert.equal(counselorRes.status, 201);
    counselor = counselorRes.body.entry;

    const orgRes = await request(port, 'POST', '/api/crisis-support', {
      token: adminToken,
      body: {
        name: 'Kandy Mental Health Collective',
        type: 'organization',
        phone: '0812223333',
        address: 'Kandy City Centre',
        city: 'Kandy',
        latitude: 7.2906,
        longitude: 80.6337,
      },
    });
    assert.equal(orgRes.status, 201);
    organization = orgRes.body.entry;

    const helplineRes = await request(port, 'POST', '/api/crisis-support', {
      token: adminToken,
      body: {
        name: 'National Mental Health Helpline',
        type: 'helpline',
        phone: '1926',
        isEmergency: true,
        is24Hours: true,
        description: 'Free confidential crisis support.',
      },
    });
    assert.equal(helplineRes.status, 201);
    helpline = helplineRes.body.entry;
    assert.equal(helpline.phone, '1926');
  });

  it('lets users view nearby hospitals, counselors, and organizations', async () => {
    const response = await request(
      port,
      'GET',
      '/api/crisis-support/nearby?lat=6.9271&lng=79.8612&radiusKm=10'
    );
    assert.equal(response.status, 200);
    assert.ok(response.body.items.some((item) => item._id === hospital._id));
    assert.ok(response.body.items.some((item) => item._id === counselor._id));
    assert.equal(response.body.items.some((item) => item._id === organization._id), false);
    assert.equal(response.body.items.some((item) => item.type === 'helpline'), false);
    assert.ok(Number.isFinite(response.body.items[0].distanceKm));
  });

  it('lets users view emergency helpline contact details', async () => {
    const response = await request(port, 'GET', '/api/crisis-support/helplines');
    assert.equal(response.status, 200);
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].phone, '1926');
    assert.equal(response.body.items[0].isEmergency, true);
    assert.equal(response.body.items[0].is24Hours, true);
  });

  it('returns directions to a nearby support service', async () => {
    const response = await request(
      port,
      'GET',
      `/api/crisis-support/${hospital._id}/directions?lat=6.90&lng=79.85`
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.latitude, 6.9271);
    assert.match(response.body.googleMapsUrl, /google.com\/maps\/dir/);
    assert.match(response.body.appleMapsUrl, /maps.apple.com/);
    assert.equal(response.body.geoUri, 'geo:6.9271,79.8612');
  });

  it('returns Help Now emergency assistance with helplines and nearby services', async () => {
    const response = await request(
      port,
      'GET',
      '/api/crisis-support/help-now?lat=6.9271&lng=79.8612'
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.guidance.emergencyNumber, '119');
    assert.equal(response.body.helplines[0].phone, '1926');
    assert.ok(response.body.nearby.some((item) => item._id === hospital._id));
  });

  it('lets a user save and remove frequently used crisis contacts', async () => {
    const saved = await request(port, 'POST', `/api/crisis-support/${helpline._id}/save`, {
      token: memberToken,
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.saved, true);

    const list = await request(port, 'GET', '/api/crisis-support/saved', { token: memberToken });
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0]._id, helpline._id);

    const removed = await request(port, 'POST', `/api/crisis-support/${helpline._id}/save`, {
      token: memberToken,
    });
    assert.equal(removed.body.saved, false);
  });

  it('lets an admin update a directory entry', async () => {
    const updated = await request(port, 'PUT', `/api/crisis-support/${helpline._id}`, {
      token: adminToken,
      body: { phone: '1926', hours: '24/7', description: 'Updated crisis line' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.entry.description, 'Updated crisis line');
    assert.equal(updated.body.entry.hours, '24/7');

    const memberUpdate = await request(port, 'PUT', `/api/crisis-support/${helpline._id}`, {
      token: memberToken,
      body: { phone: '000' },
    });
    assert.equal(memberUpdate.status, 403);
  });

  it('lets an admin delete a directory entry', async () => {
    const deleted = await request(port, 'DELETE', `/api/crisis-support/${organization._id}`, {
      token: adminToken,
    });
    assert.equal(deleted.status, 200);

    const missing = await request(port, 'GET', `/api/crisis-support/${organization._id}`);
    assert.equal(missing.status, 404);

    const memberDelete = await request(port, 'DELETE', `/api/crisis-support/${hospital._id}`, {
      token: memberToken,
    });
    assert.equal(memberDelete.status, 403);
  });

  it('hides unpublished directory entries from members', async () => {
    const draft = await request(port, 'POST', '/api/crisis-support', {
      token: adminToken,
      body: {
        name: 'Draft Helpline',
        type: 'helpline',
        phone: '0000',
        isPublished: false,
      },
    });
    const draftId = draft.body.entry._id;

    const publicList = await request(port, 'GET', '/api/crisis-support/helplines');
    assert.equal(publicList.body.items.some((item) => item._id === draftId), false);

    const publicDetail = await request(port, 'GET', `/api/crisis-support/${draftId}`, {
      token: memberToken,
    });
    assert.equal(publicDetail.status, 404);
  });
});

describe('crisis support entry model', () => {
  it('requires a name and supported type', async () => {
    const entry = new CrisisSupportEntry({ phone: '1926' });
    const error = await entry.validate().catch((validationError) => validationError);
    assert.ok(error.errors.name);
    assert.ok(error.errors.type);
  });

  it('accepts hospital, counselor, organization, and helpline records', async () => {
    const hospital = new CrisisSupportEntry({ name: 'Hospital', type: 'hospital', phone: '0112' });
    const counselor = new CrisisSupportEntry({ name: 'Counselor', type: 'counselor', address: 'Colombo' });
    const organization = new CrisisSupportEntry({ name: 'Org', type: 'organization', phone: '0113' });
    const helpline = new CrisisSupportEntry({ name: 'Helpline', type: 'helpline', phone: '1926' });

    await assert.doesNotReject(() => hospital.validate());
    await assert.doesNotReject(() => counselor.validate());
    await assert.doesNotReject(() => organization.validate());
    await assert.doesNotReject(() => helpline.validate());
  });
});
