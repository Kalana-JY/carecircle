const test = require('node:test');
const assert = require('node:assert/strict');
const MentalHealthResource = require('../src/models/MentalHealthResource');

const validResource = (overrides = {}) => new MentalHealthResource({
  title: 'Managing stress at home',
  description: 'A practical guide for stressful days.',
  resourceType: 'self-help-guide',
  type: 'self-help-guide',
  content: 'Start with one small, manageable step.',
  topics: ['stress'],
  tags: ['coping'],
  steps: [{ title: 'Pause', description: 'Take three slow breaths.', order: 1 }],
  ...overrides,
});

test('accepts articles, videos, and self-help guides', async () => {
  for (const resourceType of ['article', 'video', 'self-help-guide']) {
    await assert.doesNotReject(() => validResource({ resourceType, type: resourceType }).validate());
  }
});

test('accepts crisis support directory entries', async () => {
  const resource = validResource({
    title: 'National crisis line',
    resourceType: 'crisis-support',
    type: 'crisis-support',
    phone: '+94112345678',
    services: ['24/7 crisis counselling'],
    availability: '24 hours a day, 7 days a week',
    isEmergency: true,
  });

  await assert.doesNotReject(() => resource.validate());
});

test('rejects an unsupported resource type', async () => {
  const resource = validResource({ resourceType: 'podcast' });
  const error = await resource.validate().catch((validationError) => validationError);

  assert.ok(error.errors.resourceType);
});

test('defaults new resources to published articles', () => {
  const resource = new MentalHealthResource({ title: 'A useful article' });

  assert.equal(resource.resourceType, 'article');
  assert.equal(resource.isPublished, true);
  assert.equal(resource.language, 'en');
});