// controllers/settings.controller.js
const Settings = require('../models/Settings');
const { handleAsync, sendResponse, sendError } = require('./base.controller');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = handleAsync(async (req, res) => {
  const { group } = req.query;
  
  const query = {};
  if (group) query.group = group;

  const settings = await Settings.find(query).sort('group key');
  
  // Transform to key-value object
  const settingsObject = {};
  settings.forEach(setting => {
    settingsObject[setting.key] = setting.value;
  });

  sendResponse(res, 200, {
    settings,
    settingsObject
  });
});

// @desc    Update setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
const updateSetting = handleAsync(async (req, res) => {
  const { key } = req.params;
  const { value, group, description } = req.body;

  let setting = await Settings.findOne({ key });

  if (setting) {
    // Update existing
    setting.value = value;
    if (group) setting.group = group;
    if (description) setting.description = description;
  } else {
    // Create new
    setting = new Settings({
      key,
      value,
      group: group || 'general',
      description
    });
  }

  await setting.save();
  sendResponse(res, 200, setting, 'Setting updated successfully');
});

// @desc    Update multiple settings
// @route   POST /api/settings/bulk
// @access  Private/Admin
const bulkUpdateSettings = handleAsync(async (req, res) => {
  const settings = req.body;
  
  const operations = Object.entries(settings).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { key, value },
      upsert: true
    }
  }));

  await Settings.bulkWrite(operations);
  
  sendResponse(res, 200, null, 'Settings updated successfully');
});

// @desc    Delete setting
// @route   DELETE /api/settings/:key
// @access  Private/Admin
const deleteSetting = handleAsync(async (req, res) => {
  const { key } = req.params;
  
  const setting = await Settings.findOne({ key });
  
  if (!setting) {
    return sendError(res, 404, 'Setting not found');
  }

  await setting.deleteOne();
  sendResponse(res, 200, null, 'Setting deleted successfully');
});

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = handleAsync(async (req, res) => {
  const publicKeys = [
    'site_name',
    'site_description',
    'logo_url',
    'favicon_url',
    'contact_email',
    'contact_phone',
    'address',
    'social_media',
    'footer_text'
  ];

  const settings = await Settings.find({ key: { $in: publicKeys } });
  
  const publicSettings = {};
  settings.forEach(setting => {
    publicSettings[setting.key] = setting.value;
  });

  sendResponse(res, 200, publicSettings);
});

module.exports = {
  getSettings,
  updateSetting,
  bulkUpdateSettings,
  deleteSetting,
  getPublicSettings
};