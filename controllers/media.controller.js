// controllers/media.controller.js
const { Media, Album } = require('../models/Media');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Upload media
// @route   POST /api/media
// @access  Private
const uploadMedia = handleAsync(async (req, res) => {
  const mediaData = {
    ...req.body,
    createdBy: req.user._id
  };

  // Handle file upload
  if (req.file) {
    mediaData.file = {
      url: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    };

    // Set type based on mimetype
    if (req.file.mimetype.startsWith('image/')) {
      mediaData.type = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaData.type = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      mediaData.type = 'audio';
    } else {
      mediaData.type = 'document';
    }
  }

  // Handle thumbnail if provided
  if (req.body.thumbnail) {
    mediaData.thumbnail = {
      url: req.body.thumbnail
    };
  }

  const media = await Media.create(mediaData);
  
  sendResponse(res, 201, media, 'Media uploaded successfully');
});

// @desc    Get all media
// @route   GET /api/media
// @access  Public
const getMedia = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    status,
    tags,
    search,
    album
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (category) query.category = category;
  if (status) query.status = status;
  if (tags) query.tags = { $in: tags.split(',') };
  if (album) query.album = album;

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const media = await Media.find(query)
    .populate('createdBy', 'name email')
    .populate('album', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-isFeatured -createdAt');

  const total = await Media.countDocuments(query);

  sendResponse(res, 200, {
    media,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get media by ID
// @route   GET /api/media/:id
// @access  Public
const getMediaById = handleAsync(async (req, res) => {
  const media = await Media.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } },
    { new: true }
  )
  .populate('createdBy', 'name email')
  .populate('album', 'name description');

  if (!media) {
    return sendError(res, 404, 'Media not found');
  }

  sendResponse(res, 200, media);
});

// @desc    Update media
// @route   PUT /api/media/:id
// @access  Private
const updateMedia = handleAsync(async (req, res) => {
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    return sendError(res, 404, 'Media not found');
  }

  Object.assign(media, req.body);
  const updatedMedia = await media.save();

  sendResponse(res, 200, updatedMedia, 'Media updated successfully');
});

// @desc    Delete media
// @route   DELETE /api/media/:id
// @access  Private
const deleteMedia = handleAsync(async (req, res) => {
  const media = await Media.findById(req.params.id);
  
  if (!media) {
    return sendError(res, 404, 'Media not found');
  }

  // Here you would also delete the file from storage

  await media.deleteOne();
  sendResponse(res, 200, null, 'Media deleted successfully');
});

// @desc    Create album
// @route   POST /api/albums
// @access  Private
const createAlbum = handleAsync(async (req, res) => {
  const albumData = {
    ...req.body,
    slug: createSlug(req.body.name),
    createdBy: req.user._id
  };

  const existingAlbum = await Album.findOne({ slug: albumData.slug });
  if (existingAlbum) {
    albumData.slug = `${albumData.slug}-${Date.now()}`;
  }

  const album = await Album.create(albumData);
  
  sendResponse(res, 201, album, 'Album created successfully');
});

// @desc    Get all albums
// @route   GET /api/albums
// @access  Public
const getAlbums = handleAsync(async (req, res) => {
  const albums = await Album.find({ status: 'published' })
    .populate('createdBy', 'name')
    .sort('-createdAt');

  // Get media count for each album
  const albumsWithCount = await Promise.all(
    albums.map(async (album) => {
      const count = await Media.countDocuments({ album: album._id });
      return {
        ...album.toObject(),
        mediaCount: count
      };
    })
  );

  sendResponse(res, 200, albumsWithCount);
});

// @desc    Get album by ID or slug
// @route   GET /api/albums/:id
// @access  Public
const getAlbumById = handleAsync(async (req, res) => {
  const album = await Album.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  }).populate('createdBy', 'name email');

  if (!album) {
    return sendError(res, 404, 'Album not found');
  }

  // Get media in this album
  const media = await Media.find({ album: album._id, status: 'published' })
    .sort('-createdAt');

  sendResponse(res, 200, {
    album,
    media
  });
});

// @desc    Update album
// @route   PUT /api/albums/:id
// @access  Private
const updateAlbum = handleAsync(async (req, res) => {
  const album = await Album.findById(req.params.id);
  
  if (!album) {
    return sendError(res, 404, 'Album not found');
  }

  if (req.body.name && req.body.name !== album.name) {
    req.body.slug = createSlug(req.body.name);
    
    const existing = await Album.findOne({ 
      slug: req.body.slug,
      _id: { $ne: album._id }
    });
    
    if (existing) {
      req.body.slug = `${req.body.slug}-${Date.now()}`;
    }
  }

  Object.assign(album, req.body);
  const updatedAlbum = await album.save();

  sendResponse(res, 200, updatedAlbum, 'Album updated successfully');
});

// @desc    Delete album
// @route   DELETE /api/albums/:id
// @access  Private
const deleteAlbum = handleAsync(async (req, res) => {
  const album = await Album.findById(req.params.id);
  
  if (!album) {
    return sendError(res, 404, 'Album not found');
  }

  // Remove album reference from media
  await Media.updateMany(
    { album: album._id },
    { $unset: { album: 1 } }
  );

  await album.deleteOne();
  sendResponse(res, 200, null, 'Album deleted successfully');
});

// @desc    Add media to album
// @route   POST /api/albums/:id/media
// @access  Private
const addMediaToAlbum = handleAsync(async (req, res) => {
  const { mediaIds } = req.body;
  
  const album = await Album.findById(req.params.id);
  if (!album) {
    return sendError(res, 404, 'Album not found');
  }

  await Media.updateMany(
    { _id: { $in: mediaIds } },
    { album: album._id }
  );

  sendResponse(res, 200, null, 'Media added to album successfully');
});

module.exports = {
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
};