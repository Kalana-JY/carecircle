const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  mood: { type: String, required: true },
  intensity: { type: Number, min: 1, max: 10 },
  notes: { type: String },
  activities: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

moodSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Mood', moodSchema);
