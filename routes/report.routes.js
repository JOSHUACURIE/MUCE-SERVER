// routes/report.routes.js
const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  downloadReport
} = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getReports)
  .post(
    protect, 
    authorize('admin', 'editor'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ]),
    createReport
  );

router.get('/annual/:year', (req, res, next) => {
  req.query.type = 'annual';
  req.query.year = req.params.year;
  next();
}, getReports);

router.get('/recent', (req, res, next) => {
  req.query.limit = 5;
  next();
}, getReports);

router.route('/:id')
  .get(getReportById)
  .put(
    protect, 
    authorize('admin', 'editor'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ]),
    updateReport
  )
  .delete(protect, authorize('admin'), deleteReport);

// Download report
router.get('/:id/download', downloadReport);

// Get reports by type
router.get('/type/:type', (req, res, next) => {
  req.query.type = req.params.type;
  next();
}, getReports);

module.exports = router;