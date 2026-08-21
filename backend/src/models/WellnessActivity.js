const mongoose = require('mongoose');

const wellnessActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 40 },
  date: { type: Date, required: true },
  duration: { type: Number, required: true, min: 1, max: 1440 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  targetPerWeek: { type: Number, required: true, min: 1, max: 7 },
  logs: [{
    date: { type: Date, required: true },
    minutes: { type: Number, min: 0, max: 1440, default: 0 },
  }],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

wellnessActivitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WellnessActivity', wellnessActivitySchema);