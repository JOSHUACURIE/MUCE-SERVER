// models/Publication.js
const mongoose = require('mongoose');

const publicationSchema = new mongoose.Schema({
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
    enum: ['book', 'brochure', 'handbook', 'guide', 'toolkit', 'research', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  abstract: String,
  authors: [{
    name: String,
    role: String,
    organization: String
  }],
  publisher: {
    name: String,
    address: String,
    year: Number
  },
  isbn: String,
  pages: Number,
  language: {
    type: String,
    default: 'English'
  },
  coverImage: {
    url: String,
    publicId: String
  },
  file: {
    url: String,
    publicId: String,
    filename: String,
    size: Number,
    format: String
  },
  previewPages: [{
    url: String,
    pageNumber: Number
  }],
  categories: [String],
  tags: [String],
  downloadCount: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: true
  },
  price: Number,
  status: {
    type: String,
    enum: ['published', 'draft', 'archived'],
    default: 'published'
  },
  publicationDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Publication', publicationSchema);