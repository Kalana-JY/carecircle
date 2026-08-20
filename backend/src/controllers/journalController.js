const Journal = require('../models/Journal');

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
    return res.status(400).json({ message: 'Invalid journal input' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

// Create journal
const createJournal = async (req, res) => {
  try {
    const { date, title, body, mood, tags } = req.body;
    if (!date || !body) return res.status(400).json({ message: 'date and body are required' });
    if (!isValidDate(date)) return res.status(400).json({ message: 'date must be a valid date' });

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
    handleError(res, error);
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
      if (req.query.start) {
        if (!isValidDate(req.query.start)) return res.status(400).json({ message: 'start must be a valid date' });
        filter.date.$gte = new Date(req.query.start);
      }
      if (req.query.end) {
        if (!isValidDate(req.query.end)) return res.status(400).json({ message: 'end must be a valid date' });
        filter.date.$lte = new Date(req.query.end);
      }
    }

    const [items, total] = await Promise.all([
      Journal.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Journal.countDocuments(filter),
    ]);

    res.json({ items, meta: { page, limit, total } });
  } catch (error) {
    handleError(res, error);
  }
};

// Get single journal
const getJournal = async (req, res) => {
  try {
    const entry = await Journal.findOne({ _id: req.params.id, userId: req.user._id, deletedAt: null });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (error) {
    handleError(res, error);
  }
};

// Update journal
const updateJournal = async (req, res) => {
  try {
    const editableFields = ['date', 'title', 'body', 'mood', 'tags'];
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
    const entry = await Journal.findOneAndUpdate(
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
    handleError(res, error);
  }
};

module.exports = { createJournal, listJournals, getJournal, updateJournal, deleteJournal };
