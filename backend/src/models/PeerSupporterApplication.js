const mongoose = require('mongoose');

const peerSupporterApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [18, 'Must be at least 18 years old'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true,
  },
  experiences: {
    type: String,
    required: [true, 'Experiences are required'],
    trim: true,
  },
  evidence: {
    type: String,
    required: [true, 'Evidence is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PeerSupporterApplication', peerSupporterApplicationSchema);
