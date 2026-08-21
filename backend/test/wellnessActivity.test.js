const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const WellnessActivity = require('../src/models/WellnessActivity');

const validActivity = () => new WellnessActivity({
  userId: new mongoose.Types.ObjectId(),
  title: 'Journal every day',
  category: 'Consistency',
  date: new Date('2026-08-20T00:00:00.000Z'),
  duration: 10,
  notes: 'Write three lines',
  targetPerWeek: 5,
  logs: [{ date: new Date('2026-08-20T00:00:00.000Z'), minutes: 10 }],
});

test('accepts a complete wellness activity record', async () => {
  await assert.doesNotReject(() => validActivity().validate());
});

test('requires date and duration for a wellness activity record', async () => {
  const activity = validActivity();
  activity.date = undefined;
  activity.duration = undefined;
  const error = await activity.validate().catch((validationError) => validationError);

  assert.ok(error.errors.date);
  assert.ok(error.errors.duration);
});

test('rejects a duration outside the supported range', async () => {
  const activity = validActivity();
  activity.duration = 1441;

  const error = await activity.validate().catch((validationError) => validationError);
  assert.ok(error.errors.duration);
});

test('accepts corrected activity details during an update', async () => {
  const activity = validActivity();
  activity.title = 'Practice mindful breathing';
  activity.date = new Date('2026-08-21T00:00:00.000Z');
  activity.duration = 20;
  activity.notes = 'Updated evening routine';

  await assert.doesNotReject(() => activity.validate());
  assert.equal(activity.title, 'Practice mindful breathing');
  assert.equal(activity.duration, 20);
});

test('marks a deleted activity so it is excluded from history', async () => {
  const activity = validActivity();
  activity.deletedAt = new Date();

  await assert.doesNotReject(() => activity.validate());
  assert.ok(activity.deletedAt instanceof Date);
});