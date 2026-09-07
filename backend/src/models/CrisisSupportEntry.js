const mongoose = require('mongoose');
const { CRISIS_ENTRY_TYPES } = require('../constants/crisisSupport');

const crisisSupportEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  type: {
    type: String,
    required: [true, 'Entry type is required'],
    enum: {
      values: CRISIS_ENTRY_TYPES,
      message: 'Type must be hospital, counselor, organization, or helpline',
    },
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  phone: {
    type: String,
    trim: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  website: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  region: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  hours: {
    type: String,
    trim: true,
  },
  languages: [{
    type: String,
    trim: true,
  }],
  services: [{
    type: String,
    trim: true,
  }],
  isEmergency: {
    type: Boolean,
    default: false,
  },
  is24Hours: {
    type: Boolean,
    default: false,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

crisisSupportEntrySchema.index({ location: '2dsphere' });
crisisSupportEntrySchema.index({ type: 1, isPublished: 1 });
crisisSupportEntrySchema.index({ city: 1, type: 1 });
crisisSupportEntrySchema.index({ isEmergency: 1, isPublished: 1 });

module.exports = mongoose.model('CrisisSupportEntry', crisisSupportEntrySchema);
