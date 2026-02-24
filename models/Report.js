// models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
    enum: ['annual', 'quarterly', 'project', 'financial', 'impact', 'field', 'other'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4', null]
  },
  description: {
    type: String,
    required: true
  },
  executiveSummary: String,
  highlights: [String],
  statistics: [{
    label: String,
    value: String,
    icon: String
  }],
  coverImage: {
    url: String,
    publicId: String
  },
  file: {
    url: String,
    publicId: String,
    filename: String,
    size: Number
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'archived'],
    default: 'draft'
  },
  publishedDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);