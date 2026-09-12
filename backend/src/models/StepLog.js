const mongoose = require('mongoose');

const stepSampleSchema = new mongoose.Schema(
  {
    steps: { type: Number, required: true, min: 0 },
    recordedAt: { type: Date, default: Date.now },
    source: { type: String, trim: true, default: 'sensor' },
  },
  { _id: false }
);

const stepLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    steps: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastRecordedAt: {
      type: Date,
      default: Date.now,
    },
    samples: {
      type: [stepSampleSchema],
      default: [],
    },
  },
  { timestamps: true }
);

stepLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StepLog', stepLogSchema);
