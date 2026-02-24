// routes/subscriber.routes.js
const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  getSubscribers,
  updateSubscriber,
  deleteSubscriber,
  exportSubscribers
} = require('../controllers/subscriber.controller');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

// Protected routes (admin only)
router.route('/')
  .get(protect, authorize('admin'), getSubscribers);

router.get('/export', protect, authorize('admin'), exportSubscribers);
router.get('/active', protect, authorize('admin'), (req, res, next) => {
  req.query.isActive = 'true';
  next();
}, getSubscribers);

router.route('/:id')
  .put(protect, authorize('admin'), updateSubscriber)
  .delete(protect, authorize('admin'), deleteSubscriber);

module.exports = router;