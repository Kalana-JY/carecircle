const Mood = require('../models/Mood');

const MAX_MOOD_LENGTH = 40;
const MAX_NOTE_LENGTH = 4000;
const MAX_LIST_ITEMS = 12;
const MAX_ITEM_LENGTH = 40;

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

  console.error('Mood request failed:', error?.name || 'Error');
  return res.status(500).json({ message: 'Server error' });
};

const dayBounds = (date) => ({
  start: new Date(`${date}T00:00:00.000Z`),
  end: new Date(`${date}T23:59:59.999Z`),
});

const cleanStringList = (value, label) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
    return { ok: false, message: `${label} must be a list of up to ${MAX_LIST_ITEMS} items` };
  }
  const cleaned = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > MAX_ITEM_LENGTH) {
      return { ok: false, message: `Each ${label} item must be 1 to ${MAX_ITEM_LENGTH} characters` };
    }
    cleaned.push(item.trim());
  }
  return { ok: true, value: cleaned };
};

const cleanMoodFields = (body, { requireMood = false } = {}) => {
  const updates = {};

  if (body.mood !== undefined || requireMood) {
    if (typeof body.mood !== 'string' || !body.mood.trim() || body.mood.trim().length > MAX_MOOD_LENGTH) {
      return { error: `mood must be 1 to ${MAX_MOOD_LENGTH} characters` };
    }
    updates.mood = body.mood.trim();
  }

  if (body.date !== undefined) {
    if (!isValidDate(body.date)) return { error: 'date must be a valid date' };
    updates.date = new Date(`${body.date}T12:00:00.000Z`);
  }

  if (body.intensity !== undefined && body.intensity !== null && body.intensity !== '') {
    const intensity = Number(body.intensity);
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 10) {
      return { error: 'intensity must be a whole number from 1 to 10' };
    }
    updates.intensity = intensity;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > MAX_NOTE_LENGTH) {
      return { error: `notes must be text under ${MAX_NOTE_LENGTH} characters` };
    }
    updates.notes = body.notes;
  }

  const activities = cleanStringList(body.activities, 'activities');
  if (!activities.ok) return { error: activities.message };
  if (activities.value !== undefined) updates.activities = activities.value;

  const tags = cleanStringList(body.tags, 'tags');
  if (!tags.ok) return { error: tags.message };
  if (tags.value !== undefined) updates.tags = tags.value;

  return { updates };
};

// Create or update the authenticated user's mood for that calendar day.
const createMood = async (req, res) => {
  try {
    const { date, mood } = req.body;
    if (!date || !mood) return res.status(400).json({ message: 'date and mood are required' });
    if (!isValidDate(date)) return res.status(400).json({ message: 'date must be a valid date' });

    const cleaned = cleanMoodFields(req.body, { requireMood: true });
    if (cleaned.error) return res.status(400).json({ message: cleaned.error });

    const { start, end } = dayBounds(date);
    const sameDay = await Mood.find({
      userId: req.user._id,
      deletedAt: null,
      date: { $gte: start, $lte: end },
    }).sort({ updatedAt: -1 });

    if (sameDay.length > 0) {
      const [current, ...older] = sameDay;
      current.set(cleaned.updates);
      await current.save();

      if (older.length > 0) {
        await Mood.updateMany(
          { _id: { $in: older.map((entry) => entry._id) }, userId: req.user._id },
          { $set: { deletedAt: new Date() } }
        );
      }

      return res.status(200).json({ ...current.toObject(), updatedExisting: true });
    }

    const entry = await Mood.create({
      userId: req.user._id,
      ...cleaned.updates,
    });

    return res.status(201).json({ ...entry.toObject(), updatedExisting: false });
  } catch (error) {
    return handleError(res, error);
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
        filter.date.$gte = dayBounds(req.query.start).start;
      }
      if (req.query.end) {
        if (!isValidDate(req.query.end)) return res.status(400).json({ message: 'end must be a valid date' });
        filter.date.$lte = dayBounds(req.query.end).end;
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
    const cleaned = cleanMoodFields(req.body);
    if (cleaned.error) return res.status(400).json({ message: cleaned.error });
    const updates = cleaned.updates;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'At least one valid field is required' });
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
