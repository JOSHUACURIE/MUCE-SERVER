// routes/settings.routes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSetting,
  bulkUpdateSettings,
  deleteSetting,
  getPublicSettings
} = require('../controllers/settings.controller');
const { protect, authorize } = require('../middleware/auth');

// Public settings (no auth required)
router.get('/public', getPublicSettings);

// Protected routes (admin only)
router.route('/')
  .get(protect, authorize('admin'), getSettings)
  .post(protect, authorize('admin'), bulkUpdateSettings);

router.route('/:key')
  .put(protect, authorize('admin'), updateSetting)
  .delete(protect, authorize('admin'), deleteSetting);

// Get settings by group
router.get('/group/:group', protect, authorize('admin'), async (req, res, next) => {
  req.query.group = req.params.group;
  next();
}, getSettings);

module.exports = router;