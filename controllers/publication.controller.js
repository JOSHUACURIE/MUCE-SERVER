// controllers/publication.controller.js
const Publication = require('../models/Publication');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Create publication
// @route   POST /api/publications
// @access  Private
const createPublication = handleAsync(async (req, res) => {
  const publicationData = {
    ...req.body,
    slug: createSlug(req.body.title),
    createdBy: req.user._id
  };

  // Handle file upload if exists
  if (req.file) {
    publicationData.file = {
      url: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    };
  }

  // Handle cover image if exists
  if (req.body.coverImage) {
    publicationData.coverImage = {
      url: req.body.coverImage
    };
  }

  const existingPublication = await Publication.findOne({ slug: publicationData.slug });
  if (existingPublication) {
    publicationData.slug = `${publicationData.slug}-${Date.now()}`;
  }

  const publication = await Publication.create(publicationData);
  
  sendResponse(res, 201, publication, 'Publication created successfully');
});

// @desc    Get all publications
// @route   GET /api/publications
// @access  Public
const getPublications = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    language,
    status,
    search,
    category
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (language) query.language = language;
  if (status) query.status = status;
  if (category) query.categories = category;

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const publications = await Publication.find(query)
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-createdAt');

  const total = await Publication.countDocuments(query);

  sendResponse(res, 200, {
    publications,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get publication by ID or slug
// @route   GET /api/publications/:id
// @access  Public
const getPublicationById = handleAsync(async (req, res) => {
  const publication = await Publication.findOneAndUpdate(
    {
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ]
    },
    { $inc: { downloadCount: 0 } }, // Just for tracking, increment on actual download
    { new: true }
  ).populate('createdBy', 'name email');

  if (!publication) {
    return sendError(res, 404, 'Publication not found');
  }

  sendResponse(res, 200, publication);
});

// @desc    Update publication
// @route   PUT /api/publications/:id
// @access  Private
const updatePublication = handleAsync(async (req, res) => {
  const publication = await Publication.findById(req.params.id);
  
  if (!publication) {
    return sendError(res, 404, 'Publication not found');
  }

  if (req.body.title && req.body.title !== publication.title) {
    req.body.slug = createSlug(req.body.title);
    
    const existing = await Publication.findOne({ 
      slug: req.body.slug,
      _id: { $ne: publication._id }
    });
    
    if (existing) {
      req.body.slug = `${req.body.slug}-${Date.now()}`;
    }
  }

  // Handle new file upload
  if (req.file) {
    req.body.file = {
      url: req.file.path,
      filename: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    };
  }

  Object.assign(publication, req.body);
  const updatedPublication = await publication.save();

  sendResponse(res, 200, updatedPublication, 'Publication updated successfully');
});

// @desc    Delete publication
// @route   DELETE /api/publications/:id
// @access  Private
const deletePublication = handleAsync(async (req, res) => {
  const publication = await Publication.findById(req.params.id);
  
  if (!publication) {
    return sendError(res, 404, 'Publication not found');
  }

  // Here you would also delete associated files from storage

  await publication.deleteOne();
  sendResponse(res, 200, null, 'Publication deleted successfully');
});

// @desc    Download publication
// @route   GET /api/publications/:id/download
// @access  Public
const downloadPublication = handleAsync(async (req, res) => {
  const publication = await Publication.findById(req.params.id);
  
  if (!publication) {
    return sendError(res, 404, 'Publication not found');
  }

  // Increment download count
  publication.downloadCount += 1;
  await publication.save();

  // Redirect to file URL or send file
  if (publication.file && publication.file.url) {
    return res.redirect(publication.file.url);
  }

  sendError(res, 404, 'File not found');
});

module.exports = {
  createPublication,
  getPublications,
  getPublicationById,
  updatePublication,
  deletePublication,
  downloadPublication
};