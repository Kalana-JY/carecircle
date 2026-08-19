const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  title: { type: String },
  body: { type: String, required: true },
  mood: { type: String },
  tags: { type: [String], default: [] },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

journalSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Journal', journalSchema);
