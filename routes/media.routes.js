// routes/media.routes.js
const express = require('express');
const router = express.Router();
const {
  uploadMedia,
  getMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  createAlbum,
  getAlbums,
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  addMediaToAlbum
} = require('../controllers/media.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Media routes
router.route('/')
  .get(getMedia)
  .post(
    protect, 
    authorize('admin', 'editor'),
    upload.single('file'),
    uploadMedia
  );

router.get('/featured', (req, res, next) => {
  req.query.isFeatured = 'true';
  req.query.limit = 10;
  next();
}, getMedia);

router.get('/type/:type', (req, res, next) => {
  req.query.type = req.params.type;
  next();
}, getMedia);

router.route('/:id')
  .get(getMediaById)
  .put(protect, authorize('admin', 'editor'), updateMedia)
  .delete(protect, authorize('admin'), deleteMedia);

// Album routes
router.route('/albums')
  .get(getAlbums)
  .post(protect, authorize('admin', 'editor'), createAlbum);

router.route('/albums/:id')
  .get(getAlbumById)
  .put(protect, authorize('admin', 'editor'), updateAlbum)
  .delete(protect, authorize('admin'), deleteAlbum);

// Add media to album
router.post('/albums/:id/media', protect, authorize('admin', 'editor'), addMediaToAlbum);

// Get media by album
router.get('/albums/:id/media', async (req, res, next) => {
  req.query.album = req.params.id;
  next();
}, getMedia);

// Bulk upload
router.post('/bulk', 
  protect, 
  authorize('admin', 'editor'),
  upload.array('files', 50),
  async (req, res, next) => {
    try {
      const results = [];
      for (const file of req.files) {
        const mediaData = {
          title: req.body.title || file.originalname,
          description: req.body.description,
          category: req.body.category,
          tags: req.body.tags ? req.body.tags.split(',') : [],
          file: {
            url: file.path,
            filename: file.originalname,
            size: file.size,
            format: file.mimetype
          },
          type: file.mimetype.startsWith('image/') ? 'image' : 
                file.mimetype.startsWith('video/') ? 'video' : 'document',
          createdBy: req.user._id
        };
        
        const media = await Media.create(mediaData);
        results.push(media);
      }
      
      res.status(201).json({
        success: true,
        message: `${results.length} files uploaded successfully`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;