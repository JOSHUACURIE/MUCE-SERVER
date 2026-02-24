// routes/event.routes.js
const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  uploadGallery
} = require('../controllers/event.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getEvents)
  .post(protect, authorize('admin', 'editor'), createEvent);

router.get('/featured', (req, res, next) => {
  req.query.featured = 'true';
  req.query.limit = 5;
  next();
}, getEvents);

router.get('/upcoming', (req, res, next) => {
  req.query.status = 'upcoming';
  req.query.limit = 10;
  next();
}, getEvents);

router.route('/:id')
  .get(getEventById)
  .put(protect, authorize('admin', 'editor'), updateEvent)
  .delete(protect, authorize('admin'), deleteEvent);

// Event registration
router.post('/:id/register', registerForEvent);

// Gallery upload
router.post('/:id/gallery', 
  protect, 
  authorize('admin', 'editor'),
  upload.array('images', 20), 
  uploadGallery
);

// Get events by date range
router.get('/range/:start/:end', async (req, res, next) => {
  req.query.startDate = req.params.start;
  req.query.endDate = req.params.end;
  next();
}, getEvents);

module.exports = router;