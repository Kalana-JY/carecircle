const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.ADMIN_EMAIL = 'admin@carecircle.test';
process.env.JWT_SECRET = 'test_secret';

const User = require('../src/models/User');
const Resource = require('../src/models/MentalHealthResource');
const resourceRoutes = require('../src/routes/resourceRoutes');

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

describe('mental health resource API', { timeout: 120000, concurrency: 1 }, () => {
  let mongod;
  let server;
  let port;
  let admin;
  let member;
  let adminToken;
  let memberToken;
  let article;
  let video;
  let guide;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { ignoreUndefined: true });

    const app = express();
    app.use(express.json());
    app.use('/api/resources', resourceRoutes);
    server = await new Promise((resolve) => {
      const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
    });
    port = server.address().port;

    admin = await User.create({
      name: 'Admin',
      email: 'admin@carecircle.test',
      phoneNumber: '+10000000001',
      password: 'password',
    });
    member = await User.create({
      name: 'Member',
      email: 'member@carecircle.test',
      phoneNumber: '+10000000002',
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

  it('rejects resource creation from a non-admin user', async () => {
    const response = await request(port, 'POST', '/api/resources', {
      token: memberToken,
      body: { title: 'Blocked', type: 'article', content: 'Nope' },
    });
    assert.equal(response.status, 403);
  });

  it('lets an admin create articles, videos, and self-help guides', async () => {
    const articleRes = await request(port, 'POST', '/api/resources', {
      token: adminToken,
      body: {
        title: 'Understanding Anxiety',
        type: 'article',
        category: 'Anxiety',
        topics: ['anxiety', 'coping'],
        content: 'Anxiety is a common response to stress. Breathing can help.',
        source: 'CareCircle Clinical Team',
        author: 'Dr. Lee',
      },
    });
    assert.equal(articleRes.status, 201);
    article = articleRes.body.resource;
    assert.equal(article.type, 'article');
    assert.equal(article.content.includes('Breathing'), true);

    const videoRes = await request(port, 'POST', '/api/resources', {
      token: adminToken,
      body: {
        title: 'Guided Grounding Video',
        type: 'video',
        category: 'Mindfulness',
        topics: ['grounding'],
        url: 'https://example.com/videos/grounding',
        durationMinutes: 8,
        description: 'A short grounding practice.',
      },
    });
    assert.equal(videoRes.status, 201);
    video = videoRes.body.resource;
    assert.equal(video.type, 'video');

    const guideRes = await request(port, 'POST', '/api/resources', {
      token: adminToken,
      body: {
        title: '5-Minute Self-Help Reset',
        type: 'self-help-guide',
        category: 'Anxiety',
        topics: ['anxiety', 'self-help'],
        steps: [
          { title: 'Pause', body: 'Put both feet on the floor.', order: 1 },
          { title: 'Breathe', body: 'Inhale for 4, exhale for 6.', order: 2 },
        ],
      },
    });
    assert.equal(guideRes.status, 201);
    guide = guideRes.body.resource;
    assert.equal(guide.steps.length, 2);
  });

  it('lets users view published resources with pagination metadata', async () => {
    const response = await request(port, 'GET', '/api/resources');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.items));
    assert.equal(response.body.meta.total, 3);
    assert.equal(response.body.items.some((item) => item.content), false);
  });

  it('returns full article, video, and guide content on detail access', async () => {
    const articleRes = await request(port, 'GET', `/api/resources/${article._id}`);
    assert.equal(articleRes.status, 200);
    assert.equal(articleRes.body.content.includes('Breathing'), true);
    assert.equal(articleRes.body.shares, undefined);

    const videoRes = await request(port, 'GET', `/api/resources/${video._id}`);
    assert.equal(videoRes.body.url, 'https://example.com/videos/grounding');
    assert.equal(videoRes.body.durationMinutes, 8);

    const guideRes = await request(port, 'GET', `/api/resources/${guide._id}`);
    assert.equal(guideRes.body.steps.length, 2);
    assert.equal(guideRes.body.steps[0].title, 'Pause');
  });

  it('searches resources by keyword or title', async () => {
    const byTitle = await request(port, 'GET', '/api/resources?q=Understanding');
    assert.equal(byTitle.body.items.length, 1);
    assert.equal(byTitle.body.items[0].title, 'Understanding Anxiety');

    const byKeyword = await request(port, 'GET', '/api/resources?q=grounding');
    assert.ok(byKeyword.body.items.some((item) => item.title.includes('Grounding')));
  });

  it('filters resources by category, topic, or type', async () => {
    const byCategory = await request(port, 'GET', '/api/resources?category=Anxiety');
    assert.equal(byCategory.body.items.length, 2);

    const byTopic = await request(port, 'GET', '/api/resources?topic=grounding');
    assert.equal(byTopic.body.items.length, 1);

    const byType = await request(port, 'GET', '/api/resources?type=video');
    assert.equal(byType.body.items.length, 1);
    assert.equal(byType.body.items[0].type, 'video');

    const filters = await request(port, 'GET', '/api/resources/filters');
    assert.ok(filters.body.types.includes('article'));
    assert.ok(filters.body.categories.includes('Anxiety'));
    assert.ok(filters.body.topics.includes('anxiety'));
  });

  it('lets a user bookmark and unbookmark a resource', async () => {
    const added = await request(port, 'POST', `/api/resources/${article._id}/bookmark`, { token: memberToken });
    assert.equal(added.status, 200);
    assert.equal(added.body.bookmarked, true);

    const list = await request(port, 'GET', '/api/resources/bookmarks', { token: memberToken });
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0]._id, article._id);

    const removed = await request(port, 'POST', `/api/resources/${article._id}/bookmark`, { token: memberToken });
    assert.equal(removed.body.bookmarked, false);
  });

  it('lets a user rate and review a resource', async () => {
    const created = await request(port, 'POST', `/api/resources/${article._id}/reviews`, {
      token: memberToken,
      body: { rating: 5, comment: 'Clear and useful.' },
    });
    assert.equal(created.status, 200);
    assert.equal(created.body.averageRating, 5);
    assert.equal(created.body.reviews.length, 1);

    const updated = await request(port, 'POST', `/api/resources/${article._id}/reviews`, {
      token: memberToken,
      body: { rating: 4, comment: 'Still helpful.' },
    });
    assert.equal(updated.body.reviews.length, 1);
    assert.equal(updated.body.averageRating, 4);

    const listed = await request(port, 'GET', `/api/resources/${article._id}/reviews`);
    assert.equal(listed.body.items.length, 1);
    assert.equal(listed.body.meta.ratingsCount, 1);
  });

  it('logs a share and returns a shareable payload', async () => {
    const response = await request(port, 'POST', `/api/resources/${video._id}/share`, {
      token: memberToken,
      body: { method: 'email', sharedWith: 'friend@example.com' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.share.method, 'email');
    assert.equal(response.body.share.shareUrl, 'https://example.com/videos/grounding');
    assert.match(response.body.share.text, /Guided Grounding Video/);
  });

  it('returns personalized recommendations from interests and activity', async () => {
    await request(port, 'PUT', '/api/resources/interests', {
      token: memberToken,
      body: { interests: ['anxiety'] },
    });
    await request(port, 'POST', `/api/resources/${article._id}/bookmark`, { token: memberToken });
    await request(port, 'GET', `/api/resources/${guide._id}`, { token: memberToken });

    const response = await request(port, 'GET', '/api/resources/recommendations', { token: memberToken });
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.items));
    assert.equal(response.body.items.some((item) => item._id === article._id), false);
    assert.ok(response.body.meta.basedOn.topics.includes('anxiety'));
  });

  it('lets an admin update and delete a resource', async () => {
    const updated = await request(port, 'PUT', `/api/resources/${video._id}`, {
      token: adminToken,
      body: { title: 'Updated Grounding Video', durationMinutes: 10 },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.resource.title, 'Updated Grounding Video');
    assert.equal(updated.body.resource.durationMinutes, 10);

    const memberUpdate = await request(port, 'PUT', `/api/resources/${video._id}`, {
      token: memberToken,
      body: { title: 'Hacked' },
    });
    assert.equal(memberUpdate.status, 403);

    const deleted = await request(port, 'DELETE', `/api/resources/${video._id}`, { token: adminToken });
    assert.equal(deleted.status, 200);

    const missing = await request(port, 'GET', `/api/resources/${video._id}`);
    assert.equal(missing.status, 404);
  });

  it('hides unpublished resources from members', async () => {
    const draftRes = await request(port, 'POST', '/api/resources', {
      token: adminToken,
      body: {
        title: 'Draft Coping Article',
        type: 'article',
        content: 'Not ready yet',
        isPublished: false,
      },
    });
    const draftId = draftRes.body.resource._id;

    const publicList = await request(port, 'GET', '/api/resources');
    assert.equal(publicList.body.items.some((item) => item._id === draftId), false);

    const publicDetail = await request(port, 'GET', `/api/resources/${draftId}`, { token: memberToken });
    assert.equal(publicDetail.status, 404);

    const adminList = await request(port, 'GET', '/api/resources?includeUnpublished=true', { token: adminToken });
    assert.equal(adminList.body.items.some((item) => item._id === draftId), true);
  });
});

describe('mental health resource model', () => {
  it('requires a title and a supported content type', async () => {
    const resource = new Resource({ description: 'Missing fields' });
    const error = await resource.validate().catch((validationError) => validationError);
    assert.ok(error.errors.title);
    assert.ok(error.errors.type);
  });

  it('accepts article, video, and self-help-guide records', async () => {
    const article = new Resource({ title: 'Article', type: 'article', content: 'Body' });
    const video = new Resource({ title: 'Video', type: 'video', url: 'https://example.com/v' });
    const guide = new Resource({
      title: 'Guide',
      type: 'self-help-guide',
      steps: [{ title: 'Step 1', body: 'Do this' }],
    });

    await assert.doesNotReject(() => article.validate());
    await assert.doesNotReject(() => video.validate());
    await assert.doesNotReject(() => guide.validate());
  });
});
