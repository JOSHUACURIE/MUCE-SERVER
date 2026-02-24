// models/Newsletter.js
const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
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
  issue: {
    volume: Number,
    number: Number,
    month: String,
    year: Number
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: String,
  featuredImage: {
    url: String,
    publicId: String
  },
  articles: [{
    title: String,
    content: String,
    author: String,
    image: String,
    order: Number
  }],
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  recipients: {
    type: Number,
    default: 0
  },
  openRate: {
    type: Number,
    default: 0
  },
  clickRate: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'archived'],
    default: 'draft'
  },
  scheduledDate: Date,
  sentDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Newsletter', newsletterSchema);