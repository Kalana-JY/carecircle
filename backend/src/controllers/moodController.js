const Mood = require('../models/Mood');

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) return false;
  const [, yearText, monthText, dayText] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
};

const handleError = (res, error) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid mood input' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

// Create mood
const createMood = async (req, res) => {
  try {
    const { date, mood, intensity, notes, activities, tags } = req.body;
    if (!date || !mood) return res.status(400).json({ message: 'date and mood are required' });
    if (!isValidDate(date)) return res.status(400).json({ message: 'date must be a valid date' });

    const entry = await Mood.create({
      userId: req.user._id,
      date,
      mood,
      intensity,
      notes,
      activities,
      tags,
    });

    res.status(201).json(entry);
  } catch (error) {
    handleError(res, error);
  }
};

// List moods with pagination and optional date range
const listMoods = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id, deletedAt: null };
    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) {
        if (!isValidDate(req.query.start)) return res.status(400).json({ message: 'start must be a valid date' });
        filter.date.$gte = new Date(req.query.start);
      }
      if (req.query.end) {
        if (!isValidDate(req.query.end)) return res.status(400).json({ message: 'end must be a valid date' });
        filter.date.$lte = new Date(req.query.end);
      }
    }
    if (req.query.mood) filter.mood = req.query.mood;

    const [items, total] = await Promise.all([
      Mood.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Mood.countDocuments(filter),
    ]);

    res.json({ items, meta: { page, limit, total } });
  } catch (error) {
    handleError(res, error);
  }
};

// Get single mood
const getMood = async (req, res) => {
  try {
    const entry = await Mood.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (error) {
    handleError(res, error);
  }
};

// Update mood
const updateMood = async (req, res) => {
  try {
    const editableFields = ['date', 'mood', 'intensity', 'notes', 'activities', 'tags'];
    const updates = Object.fromEntries(
      editableFields
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]])
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'At least one valid field is required' });
    }
    if (updates.date !== undefined && !isValidDate(updates.date)) {
      return res.status(400).json({ message: 'date must be a valid date' });
    }
    const entry = await Mood.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json(entry);
  } catch (error) {
    handleError(res, error);
  }
};

// Soft delete mood
const deleteMood = async (req, res) => {
  try {
    const entry = await Mood.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    if (!entry) return res.status(404).json({ message: 'Not found or not authorized' });
    res.status(204).end();
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { createMood, listMoods, getMood, updateMood, deleteMood };
