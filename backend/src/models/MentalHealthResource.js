const mongoose = require('mongoose');
//
const mentalHealthResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
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
    trim: true,
  },
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

// text index for simple searching
mentalHealthResourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('MentalHealthResource', mentalHealthResourceSchema);
