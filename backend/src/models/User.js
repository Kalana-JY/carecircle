const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please use a valid phone number in E.164 format (e.g. +94771234567)'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentalHealthResource',
  }],
  interests: [{
    type: String,
    trim: true,
  }],
  resourceViews: [{
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'MentalHealthResource' },
    viewedAt: { type: Date, default: Date.now },
  }],
  savedCrisisContacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrisisSupportEntry',
  }],
  personalCrisisContacts: [{
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true, default: '' },
  }],
  stepSensorPermission: {
    type: String,
    enum: ['undetermined', 'granted', 'denied'],
    default: 'undetermined',
  },
  stepSensorPermissionAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
