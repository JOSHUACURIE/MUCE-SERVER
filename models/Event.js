// models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['workshop', 'seminar', 'training', 'meeting', 'campaign', 'other'],
    default: 'other'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  location: {
    venue: String,
    address: String,
    city: String,
    country: String,
    isOnline: Boolean,
    meetingLink: String // if online
  },
  organizer: {
    name: String,
    contact: String,
    email: String
  },
  capacity: {
    type: Number,
    default: null
  },
  registeredCount: {
    type: Number,
    default: 0
  },
  coverImage: {
    url: String,
    publicId: String
  },
  gallery: [{
    url: String,
    caption: String
  }],
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: Date,
  tags: [String],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for searching
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);