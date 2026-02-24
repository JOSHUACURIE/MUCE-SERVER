// routes/newsletter.routes.js
const express = require('express');
const router = express.Router();
const {
  createNewsletter,
  getNewsletters,
  getNewsletterById,
  updateNewsletter,
  deleteNewsletter,
  sendNewsletter,
  getNewsletterStats
} = require('../controllers/newsletter.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Newsletter stats (must come before /:id route)
router.get('/stats', protect, authorize('admin'), getNewsletterStats);

// Public routes
router.route('/')
  .get(getNewsletters)
  .post(
    protect, 
    authorize('admin', 'editor'),
    upload.single('featuredImage'),
    createNewsletter
  );

router.get('/latest', (req, res, next) => {
  req.query.limit = 1;
  req.query.status = 'sent';
  next();
}, getNewsletters);

router.route('/:id')
  .get(getNewsletterById)
  .put(
    protect, 
    authorize('admin', 'editor'),
    upload.single('featuredImage'),
    updateNewsletter
  )
  .delete(protect, authorize('admin'), deleteNewsletter);

// Send newsletter
router.post('/:id/send', protect, authorize('admin'), sendNewsletter);

// Get newsletters by status
router.get('/status/:status', (req, res, next) => {
  req.query.status = req.params.status;
  next();
}, getNewsletters);

module.exports = router;