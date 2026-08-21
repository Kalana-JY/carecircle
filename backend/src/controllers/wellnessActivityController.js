const WellnessActivity = require('../models/WellnessActivity');

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
};

const handleError = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid wellness activity input' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

const createActivity = async (req, res) => {
  try {
    const { title, category, date, duration, notes = '', targetPerWeek = 5 } = req.body;
    if (!title || !category || !isValidDate(date) || duration === undefined) {
      return res.status(400).json({ message: 'title, category, date, and duration are required' });
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      return res.status(400).json({ message: 'duration must be a whole number from 1 to 1440' });
    }
    const activity = await WellnessActivity.create({
      userId: req.user._id,
      title,
      category,
      date: new Date(`${date}T00:00:00.000Z`),
      duration,
      notes,
      targetPerWeek,
      logs: [{ date: new Date(`${date}T00:00:00.000Z`), minutes: duration }],
    });
    return res.status(201).json(activity);
  } catch (error) { return handleError(res, error); }
};

const listActivities = async (req, res) => {
  try {
    const activities = await WellnessActivity.find({ userId: req.user._id, deletedAt: null }).sort({ date: -1, createdAt: -1 });
    return res.json({ items: activities, meta: { total: activities.length } });
  } catch (error) { return handleError(res, error); }
};

const updateActivity = async (req, res) => {
  try {
    const updates = {};
    ['title', 'category', 'date', 'duration', 'notes', 'targetPerWeek'].forEach((field) => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    if (!Object.keys(updates).length) return res.status(400).json({ message: 'At least one valid field is required' });
    if (updates.date !== undefined) {
      if (!isValidDate(updates.date)) return res.status(400).json({ message: 'date must be a valid date' });
      updates.date = new Date(`${updates.date}T00:00:00.000Z`);
    }
    if (updates.duration !== undefined && (!Number.isInteger(updates.duration) || updates.duration < 1 || updates.duration > 1440)) {
      return res.status(400).json({ message: 'duration must be a whole number from 1 to 1440' });
    }
    const activity = await WellnessActivity.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, deletedAt: null }, { $set: updates }, { new: true, runValidators: true });
    if (!activity) return res.status(404).json({ message: 'Not found or not authorized' });
    return res.json(activity);
  } catch (error) { return handleError(res, error); }
};

const deleteActivity = async (req, res) => {
  try {
    const activity = await WellnessActivity.findOneAndUpdate({ _id: req.params.id, userId: req.user._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
    if (!activity) return res.status(404).json({ message: 'Not found or not authorized' });
    return res.status(204).end();
  } catch (error) { return handleError(res, error); }
};

const logActivity = async (req, res) => {
  try {
    const { date, minutes = 0 } = req.body;
    if (!isValidDate(date)) return res.status(400).json({ message: 'date must be a valid date' });
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return res.status(400).json({ message: 'minutes must be a whole number from 0 to 1440' });
    const activity = await WellnessActivity.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
    if (!activity) return res.status(404).json({ message: 'Not found or not authorized' });
    const existingLog = activity.logs.find((log) => log.date.toISOString().slice(0, 10) === date);
    if (existingLog) existingLog.minutes = minutes;
    else activity.logs.push({ date: new Date(`${date}T00:00:00.000Z`), minutes });
    await activity.save();
    return res.json(activity);
  } catch (error) { return handleError(res, error); }
};

module.exports = { createActivity, listActivities, updateActivity, deleteActivity, logActivity };