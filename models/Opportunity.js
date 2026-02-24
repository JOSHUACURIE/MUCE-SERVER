// models/Opportunity.js
const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['job', 'internship', 'volunteer', 'fellowship', 'grant', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'remote'],
    default: 'full-time'
  },
  description: {
    type: String,
    required: true
  },
  responsibilities: [String],
  requirements: [String],
  qualifications: {
    education: String,
    experience: String,
    skills: [String]
  },
  location: {
    type: String,
    required: true
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  salary: {
    amount: String,
    currency: String,
    isNegotiable: Boolean
  },
  applicationDeadline: {
    type: Date,
    required: true
  },
  duration: String, // e.g., "6 months", "1 year"
  startDate: Date,
  openings: {
    type: Number,
    default: 1
  },
  organization: {
    name: String,
    website: String,
    email: String,
    description: String
  },
  howToApply: {
    type: String,
    required: true
  },
  applicationLink: String,
  contactEmail: String,
  documents: [{
    name: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'filled', 'draft'],
    default: 'active'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applications: [{
    name: String,
    email: String,
    phone: String,
    resume: String,
    coverLetter: String,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

opportunitySchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Opportunity', opportunitySchema);