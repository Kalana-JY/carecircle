const Journal = require('../models/Journal');

// Create journal
const createJournal = async (req, res) => {
  try {
    const { date, title, body, mood, tags } = req.body;
    if (!date || !body) return res.status(400).json({ message: 'date and body are required' });

    const entry = await Journal.create({
      userId: req.user._id,
      date,
      title,
      body,
      mood,
      tags,
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// List journals with pagination and optional date range
const listJournals = async (req, res) => {
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

    const [items, total] = await Promise.all([
      Journal.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Journal.countDocuments(filter),
    ]);

    res.json({ items, meta: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single journal
const getJournal = async (req, res) => {
  try {
    const entry = await Journal.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update journal
const updateJournal = async (req, res) => {
  try {
    const entry = await Journal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: req.body },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Not found or not authorized' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Soft delete journal
const deleteJournal = async (req, res) => {
  try {
    const entry = await Journal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    if (!entry) return res.status(404).json({ message: 'Not found or not authorized' });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createJournal, listJournals, getJournal, updateJournal, deleteJournal };
