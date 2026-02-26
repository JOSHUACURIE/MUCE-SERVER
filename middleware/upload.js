// middleware/upload.js
const multer = require('multer');
const { storages } = require('../config/cloudinary');

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
  const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];

  if (allowedImageTypes.includes(file.mimetype)) {
    file.fileType = 'image';
    cb(null, true);
  } else if (allowedDocTypes.includes(file.mimetype)) {
    file.fileType = 'document';
    cb(null, true);
  } else if (allowedVideoTypes.includes(file.mimetype)) {
    file.fileType = 'video';
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and videos are allowed.'), false);
  }
};

// Select storage based on file type and purpose
const getStorage = (req, file) => {
  // Check if specific storage is requested in the route
  if (req.query.storage === 'profile') {
    return storages.profiles;
  }
  if (req.query.storage === 'gallery') {
    return storages.gallery;
  }
  
  // Default based on file type
  switch (file.fileType) {
    case 'image':
      return storages.images;
    case 'video':
      return storages.videos;
    case 'document':
      return storages.documents;
    default:
      return storages.documents;
  }
};

// Create multer upload instance with dynamic storage
const upload = multer({
  storage: multer.diskStorage({}), // Temporary, will be overridden by Cloudinary
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: fileFilter
});

// Middleware to handle Cloudinary upload
const uploadToCloudinary = (storageType) => {
  return multer({
    storage: storages[storageType] || storages.images,
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
    fileFilter: fileFilter
  });
};

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

module.exports = { 
  upload, 
  uploadToCloudinary,
  handleUploadError 
};