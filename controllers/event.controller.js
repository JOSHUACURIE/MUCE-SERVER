// controllers/event.controller.js
const Event = require('../models/Event');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Create event
// @route   POST /api/events
// @access  Private
const createEvent = handleAsync(async (req, res) => {
  const eventData = {
    ...req.body,
    slug: createSlug(req.body.title),
    createdBy: req.user._id
  };

  // Check if slug exists
  const existingEvent = await Event.findOne({ slug: eventData.slug });
  if (existingEvent) {
    eventData.slug = `${eventData.slug}-${Date.now()}`;
  }

  const event = await Event.create(eventData);
  
  sendResponse(res, 201, event, 'Event created successfully');
});

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    type,
    startDate,
    endDate,
    search,
    featured
  } = req.query;

  const query = {};

  // Filters
  if (status) query.status = status;
  if (type) query.type = type;
  if (featured === 'true') query.isFeatured = true;
  
  // Date range filter
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  // Search
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const events = await Event.find(query)
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-createdAt');

  const total = await Event.countDocuments(query);

  sendResponse(res, 200, {
    events,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get event by ID or slug
// @route   GET /api/events/:id
// @access  Public
const getEventById = handleAsync(async (req, res) => {
  const event = await Event.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  }).populate('createdBy', 'name email');

  if (!event) {
    return sendError(res, 404, 'Event not found');
  }

  sendResponse(res, 200, event);
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = handleAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return sendError(res, 404, 'Event not found');
  }

  // Check if title changed and update slug
  if (req.body.title && req.body.title !== event.title) {
    req.body.slug = createSlug(req.body.title);
    
    // Check for duplicate slug
    const existingEvent = await Event.findOne({ 
      slug: req.body.slug,
      _id: { $ne: event._id }
    });
    
    if (existingEvent) {
      req.body.slug = `${req.body.slug}-${Date.now()}`;
    }
  }

  Object.assign(event, req.body);
  const updatedEvent = await event.save();

  sendResponse(res, 200, updatedEvent, 'Event updated successfully');
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = handleAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return sendError(res, 404, 'Event not found');
  }

  await event.deleteOne();
  sendResponse(res, 200, null, 'Event deleted successfully');
});

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Public
const registerForEvent = handleAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return sendError(res, 404, 'Event not found');
  }

  if (event.status !== 'upcoming') {
    return sendError(res, 400, 'Event is not available for registration');
  }

  if (event.capacity && event.registeredCount >= event.capacity) {
    return sendError(res, 400, 'Event is full');
  }

  // Here you would typically create a registration record
  event.registeredCount += 1;
  await event.save();

  sendResponse(res, 200, { registeredCount: event.registeredCount }, 'Registration successful');
});

// @desc    Upload event gallery images
// @route   POST /api/events/:id/gallery
// @access  Private
const uploadGallery = handleAsync(async (req, res) => {
  const event = await Event.findById(req.params.id);
  
  if (!event) {
    return sendError(res, 404, 'Event not found');
  }

  // Assuming files are uploaded via multer
  if (req.files && req.files.length > 0) {
    const galleryImages = req.files.map(file => ({
      url: file.path,
      caption: req.body.caption || ''
    }));
    
    event.gallery.push(...galleryImages);
    await event.save();
  }

  sendResponse(res, 200, event.gallery, 'Gallery updated successfully');
});

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  uploadGallery
};