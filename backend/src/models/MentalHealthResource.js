const mongoose = require('mongoose');
const { RESOURCE_TYPES } = require('../constants/resources');

const stepSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Step title is required'],
    trim: true,
  },
  body: {
    type: String,
    trim: true,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: [1000, 'Comment cannot exceed 1000 characters'] },
}, { timestamps: true });

const shareSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sharedWith: { type: String, trim: true, default: '' },
  method: { type: String, trim: true, default: 'link' },
  createdAt: { type: Date, default: Date.now },
});

const mentalHealthResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  content: {
    type: String,
    trim: true,
    default: '',
  },
  url: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  topics: [{
    type: String,
    trim: true,
  }],
  type: {
    type: String,
    required: [true, 'Resource type is required'],
    enum: {
      values: RESOURCE_TYPES,
      message: 'Type must be article, video, or self-help-guide',
    },
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  source: {
    type: String,
    trim: true,
  },
  author: {
    type: String,
    trim: true,
  },
  durationMinutes: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
  },
  steps: [stepSchema],
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
  },
  ratingsCount: {
    type: Number,
    default: 0,
  },
  shares: [shareSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

mentalHealthResourceSchema.index({ title: 'text', description: 'text', tags: 'text', content: 'text', topics: 'text' });
mentalHealthResourceSchema.index({ category: 1, type: 1 });
mentalHealthResourceSchema.index({ topics: 1 });
mentalHealthResourceSchema.index({ isPublished: 1, createdAt: -1 });

mentalHealthResourceSchema.methods.recalculateRating = function recalculateRating() {
  const ratings = this.reviews.map((review) => review.rating || 0).filter((value) => value > 0);
  this.ratingsCount = ratings.length;
  this.averageRating = ratings.length
    ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
    : 0;
};

module.exports = mongoose.model('MentalHealthResource', mentalHealthResourceSchema);
