const mongoose = require('mongoose');

const RESOURCE_TYPES = ['article', 'video', 'self-help-guide', 'crisis-support'];

const mentalHealthResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  url: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    trim: true,
  },
  resourceType: {
    type: String,
    enum: RESOURCE_TYPES,
    default: 'article',
    index: true,
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
    trim: true,
  },
  author: {
    type: String,
    trim: true,
  },
  publisher: {
    type: String,
    trim: true,
  },
  thumbnailUrl: {
    type: String,
    trim: true,
  },
  durationMinutes: {
    type: Number,
    min: 1,
  },
  language: {
    type: String,
    trim: true,
    default: 'en',
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  steps: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, min: 1 },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  services: [{
    type: String,
    trim: true,
  }],
  availability: {
    type: String,
    trim: true,
  },
  isEmergency: {
    type: Boolean,
    default: false,
  },
  location: {
    city: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  // Reviews embedded for simplicity
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
  }],
  averageRating: {
    type: Number,
    default: 0,
  },
  ratingsCount: {
    type: Number,
    default: 0,
  },
  // Share logs (who shared with whom/method)
  shares: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sharedWith: { type: String, trim: true },
    method: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Text search covers the fields users see when browsing the library.
mentalHealthResourceSchema.index({ title: 'text', description: 'text', content: 'text', tags: 'text', topics: 'text' });

module.exports = mongoose.model('MentalHealthResource', mentalHealthResourceSchema);
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
//