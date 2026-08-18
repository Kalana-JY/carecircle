const mongoose = require('mongoose');

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
      enum: ['health', 'fitness', 'mental-health', 'career', 'education', 'personal', 'financial', 'other'],
      default: 'personal',
    },
    target: {
      type: String,
      trim: true,
    },
    targetValue: {
      type: Number,
      default: null,
    },
    targetUnit: {
      type: String,
      trim: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    deadline: {
      type: Date,
      required: [true, 'Please provide a deadline'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'paused'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
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

// Middleware to update status based on deadline
goalSchema.pre('save', function (next) {
  if (this.status !== 'completed' && this.deadline < new Date()) {
    this.status = 'overdue';
  }
  next();
});

// Instance method to mark goal as completed
goalSchema.methods.markComplete = function () {
  this.status = 'completed';
  this.progress = 100;
  this.completedDate = new Date();
  return this.save();
};

// Static method to find user's goals by status
goalSchema.statics.findByStatus = function (userId, status) {
  return this.find({ userId, status });
};

// Index for faster queries
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

module.exports = mongoose.model('Goal', goalSchema);
