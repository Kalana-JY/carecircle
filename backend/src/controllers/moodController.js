const Mood = require('../models/Mood');

// Create mood
const createMood = async (req, res) => {
  try {
    const { date, mood, intensity, notes, activities, tags } = req.body;
    if (!date || !mood) return res.status(400).json({ message: 'date and mood are required' });

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
    res.status(500).json({ message: 'Server error', error: error.message });
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
      if (req.query.start) filter.date.$gte = new Date(req.query.start);
      if (req.query.end) filter.date.$lte = new Date(req.query.end);
    }
    if (req.query.mood) filter.mood = req.query.mood;

    const [items, total] = await Promise.all([
      Mood.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Mood.countDocuments(filter),
    ]);

    res.json({ items, meta: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single mood
const getMood = async (req, res) => {
  try {
    const entry = await Mood.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const entry = await Mood.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createMood, listMoods, getMood, updateMood, deleteMood };
