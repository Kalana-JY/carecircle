const mongoose = require('mongoose');
const { GOAL_CATEGORIES, GOAL_STATUSES, GOAL_PRIORITIES, TRACKING_TYPES } = require('../constants/goals');

const progressEntrySchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      min: [0, 'Progress value cannot be negative'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Progress note cannot exceed 500 characters'],
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a goal title'],
      trim: true,
      maxlength: [100, 'Goal title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: GOAL_CATEGORIES,
      required: [true, 'Please provide a goal category'],
    },
    target: {
      type: String,
      required: [true, 'Please provide a goal target'],
      trim: true,
      maxlength: [200, 'Target cannot exceed 200 characters'],
    },
    targetValue: {
      type: Number,
      default: null,
      min: [0, 'Target value cannot be negative'],
    },
    targetUnit: {
      type: String,
      trim: true,
    },
    trackingType: {
      type: String,
      enum: TRACKING_TYPES,
      default: 'manual',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    progressEntries: {
      type: [progressEntrySchema],
      default: [],
    },
    deadline: {
      type: Date,
      required: [true, 'Please provide a deadline'],
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: 'active',
    },
    priority: {
      type: String,
      enum: GOAL_PRIORITIES,
      default: 'medium',
    },
    completedDate: {
      type: Date,
      default: null,
    },
    milestones: [
      {
        title: String,
        targetDate: Date,
        completed: {
          type: Boolean,
          default: false,
        },
        completedDate: Date,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

goalSchema.methods.recordedProgress = function recordedProgress() {
  return this.progressEntries.reduce((total, entry) => total + entry.value, 0);
};

goalSchema.methods.todayRecordedProgress = function todayRecordedProgress(now = new Date()) {
  const todayKey = now.toISOString().slice(0, 10);
  return this.progressEntries.reduce((total, entry) => {
    if (!entry.recordedAt) return total;
    return entry.recordedAt.toISOString().slice(0, 10) === todayKey ? total + entry.value : total;
  }, 0);
};

goalSchema.methods.recalculateProgress = function recalculateProgress() {
  if (this.trackingType === 'steps') {
    const recorded = this.todayRecordedProgress();
    const target = typeof this.targetValue === 'number' && this.targetValue > 0 ? this.targetValue : 10000;
    this.progress = Math.min(100, Math.round((recorded / target) * 10000) / 100);
  } else {
    const recorded = this.recordedProgress();
    if (typeof this.targetValue === 'number' && this.targetValue > 0) {
      this.progress = Math.min(100, Math.round((recorded / this.targetValue) * 10000) / 100);
    } else if (this.progressEntries.length > 0) {
      this.progress = Math.min(100, recorded);
    }
  }

  if (this.progress >= 100 && this.status !== 'paused') {
    this.progress = 100;
    this.status = 'completed';
    this.completedDate = this.completedDate || new Date();
  }

  return this;
};

goalSchema.methods.applyOverdueStatus = function applyOverdueStatus(now = new Date()) {
  if (this.status === 'completed' || this.status === 'paused') {
    return this;
  }

  if (this.deadline && this.deadline < now) {
    this.status = 'overdue';
  } else if (this.status === 'overdue') {
    this.status = 'active';
  }

  return this;
};

goalSchema.methods.markComplete = function markComplete() {
  this.status = 'completed';
  this.progress = 100;
  this.completedDate = new Date();
  return this.save();
};

goalSchema.statics.findByStatus = function findByStatus(userId, status) {
  return this.find({ userId, status });
};

goalSchema.pre('save', function applyDerivedFields() {
  if (this.status !== 'completed' && this.progressEntries && this.progressEntries.length > 0) {
    this.recalculateProgress();
  }
  this.applyOverdueStatus();
});

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

module.exports = mongoose.model('Goal', goalSchema);
