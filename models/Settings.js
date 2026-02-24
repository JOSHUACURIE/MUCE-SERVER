// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: mongoose.Schema.Types.Mixed,
  group: {
    type: String,
    enum: ['general', 'seo', 'social', 'email', 'payment', 'other'],
    default: 'general'
  },
  description: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);