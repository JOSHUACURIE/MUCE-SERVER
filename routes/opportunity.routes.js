// routes/opportunity.routes.js
const express = require('express');
const router = express.Router();
const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  applyForOpportunity,
  getApplications
} = require('../controllers/opportunity.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getOpportunities)
  .post(protect, authorize('admin', 'editor'), createOpportunity);

router.get('/featured', (req, res, next) => {
  req.query.featured = 'true';
  req.query.limit = 5;
  next();
}, getOpportunities);

router.get('/active', (req, res, next) => {
  req.query.status = 'active';
  next();
}, getOpportunities);

router.route('/:id')
  .get(getOpportunityById)
  .put(protect, authorize('admin', 'editor'), updateOpportunity)
  .delete(protect, authorize('admin'), deleteOpportunity);

// Job applications
router.post('/:id/apply', 
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]), 
  applyForOpportunity
);

router.get('/:id/applications', 
  protect, 
  authorize('admin', 'editor'),
  getApplications
);

// Get opportunities by type
router.get('/type/:type', (req, res, next) => {
  req.query.type = req.params.type;
  next();
}, getOpportunities);

module.exports = router;