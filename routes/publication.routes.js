// routes/publication.routes.js
const express = require('express');
const router = express.Router();
const {
  createPublication,
  getPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  downloadPublication
} = require('../controllers/publication.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getPublications)
  .post(
    protect, 
    authorize('admin', 'editor'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ]),
    createPublication
  );

router.get('/featured', (req, res, next) => {
  req.query.featured = 'true';
  req.query.limit = 5;
  next();
}, getPublications);

router.get('/recent', (req, res, next) => {
  req.query.limit = 10;
  next();
}, getPublications);

router.route('/:id')
  .get(getPublicationById)
  .put(
    protect, 
    authorize('admin', 'editor'),
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ]),
    updatePublication
  )
  .delete(protect, authorize('admin'), deletePublication);

// Download publication
router.get('/:id/download', downloadPublication);

// Get publications by type
router.get('/type/:type', (req, res, next) => {
  req.query.type = req.params.type;
  next();
}, getPublications);

module.exports = router;