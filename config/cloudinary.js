// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create storage for different file types
const createStorage = (folder, allowedFormats, transformation = {}) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `ngo-dashboard/${folder}`,
      allowed_formats: allowedFormats,
      transformation: transformation,
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return `${file.fieldname}-${uniqueSuffix}`;
      }
    }
  });
};

// Specific storage configurations
const storages = {
  // For images (events, publications, etc.)
  images: createStorage('images', ['jpg', 'jpeg', 'png', 'gif', 'webp'], {
    width: 1200,
    height: 1200,
    crop: 'limit',
    quality: 'auto'
  }),
  
  // For profile pictures
  profiles: createStorage('profiles', ['jpg', 'jpeg', 'png'], {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto'
  }),
  
  // For gallery images
  gallery: createStorage('gallery', ['jpg', 'jpeg', 'png', 'webp'], {
    width: 1600,
    height: 1600,
    crop: 'limit',
    quality: 'auto'
  }),
  
  // For documents (PDFs, etc.)
  documents: createStorage('documents', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']),
  
  // For videos
  videos: createStorage('videos', ['mp4', 'mov', 'avi'], {
    quality: 'auto',
    fetch_format: 'auto'
  })
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  });
};

module.exports = {
  cloudinary,
  storages,
  deleteFromCloudinary,
  getOptimizedUrl
};