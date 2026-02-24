// models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: true
  },
  category: {
    type: String,
    enum: ['event', 'project', 'campaign', 'training', 'community', 'other'],
    required: true
  },
  file: {
    url: {
      type: String,
      required: true
    },
    publicId: String,
    filename: String,
    size: Number,
    format: String,
    duration: Number // for videos/audio
  },
  thumbnail: {
    url: String,
    publicId: String
  },
  metadata: {
    width: Number,
    height: Number,
    location: String,
    dateTaken: Date,
    photographer: String
  },
  tags: [String],
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'private'],
    default: 'published'
  },
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Album schema for grouping media
const albumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  coverImage: String,
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  date: Date,
  location: String,
  status: {
    type: String,
    enum: ['published', 'private'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Media = mongoose.model('Media', mediaSchema);
const Album = mongoose.model('Album', albumSchema);

module.exports = { Media, Album };