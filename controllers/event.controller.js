// controllers/event.controller.js
const Event = require('../models/Event');
const { 
  handleAsync, 
  sendResponse, 
  sendError, 
  generateUniqueSlug,
  formatPagination,
  parseFilters,
  parseSearch,
  parseSort 
} = require('./base.controller');

const createEvent = handleAsync(async (req, res) => {
  console.log('📝 Creating event with data:', req.body);
  console.log('📁 Files:', req.file);
  console.log('🔍 Content-Type:', req.get('Content-Type'));
  console.log('👤 Created by:', req.user._id);

  // Handle both JSON and FormData
  let eventData = { ...req.body };
  
  // If using FormData, some fields might be stringified JSON
  if (req.get('Content-Type')?.includes('multipart/form-data')) {
    console.log('📦 Processing FormData...');
    
    // Parse JSON fields if they exist
    ['location', 'organizer', 'tags', 'metadata'].forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          // Check if it's a JSON string (starts with { or [)
          const trimmed = req.body[field].trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            req.body[field] = JSON.parse(trimmed);
            console.log(`✅ Parsed ${field} as JSON:`, req.body[field]);
          } else {
            console.log(`ℹ️ Field ${field} is not JSON, keeping as string:`, trimmed);
          }
        } catch (e) {
          console.log(`⚠️ Field ${field} JSON parse error:`, e.message);
          // Keep as string if parsing fails
        }
      }
    });
    
    // Handle numeric fields that might come as strings
    ['capacity', 'registeredCount'].forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        const parsed = parseInt(req.body[field]);
        if (!isNaN(parsed)) {
          req.body[field] = parsed;
          console.log(`✅ Parsed ${field} as number:`, parsed);
        }
      }
    });
    
    // Handle boolean fields
    ['isFeatured', 'registrationRequired', 'location.isOnline'].forEach(field => {
      if (req.body[field] !== undefined) {
        if (req.body[field] === 'true' || req.body[field] === 'false') {
          req.body[field] = req.body[field] === 'true';
          console.log(`✅ Parsed ${field} as boolean:`, req.body[field]);
        }
      }
    });
  }

  // Log processed body for debugging
  console.log('🔄 Processed body:', JSON.stringify(req.body, null, 2));

  // Validate required fields
  const requiredFields = ['title', 'description', 'startDate', 'endDate'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    console.log('❌ Missing fields:', missingFields);
    console.log('📦 Received body:', req.body);
    return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate dates
  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  
  if (isNaN(startDate.getTime())) {
    return sendError(res, 400, `Invalid start date format: ${req.body.startDate}`);
  }
  
  if (isNaN(endDate.getTime())) {
    return sendError(res, 400, `Invalid end date format: ${req.body.endDate}`);
  }
  
  if (startDate >= endDate) {
    return sendError(res, 400, 'Start date must be before end date');
  }

  // Generate unique slug
  let slug;
  try {
    slug = await generateUniqueSlug(
      req.body.title,
      async (slug) => await Event.findOne({ slug })
    );
    console.log('✅ Generated slug:', slug);
  } catch (error) {
    console.error('❌ Error generating slug:', error);
    // Fallback slug
    slug = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // Prepare event data
  const eventDataToSave = {
    title: req.body.title,
    slug,
    description: req.body.description,
    shortDescription: req.body.shortDescription || req.body.description.substring(0, 200),
    type: req.body.type || 'other',
    startDate: startDate,
    endDate: endDate,
    status: req.body.status || 'upcoming',
    isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true || false,
    createdBy: req.user._id,
    tags: []
  };

  // Handle tags
  if (req.body.tags) {
    if (Array.isArray(req.body.tags)) {
      eventDataToSave.tags = req.body.tags;
    } else if (typeof req.body.tags === 'string') {
      eventDataToSave.tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
    }
    console.log('🏷️ Tags:', eventDataToSave.tags);
  }

  // Handle location
  if (req.body.location) {
    try {
      if (typeof req.body.location === 'string') {
        // Try to parse JSON string
        try {
          eventDataToSave.location = JSON.parse(req.body.location);
        } catch (e) {
          // If not JSON, treat as simple string location
          eventDataToSave.location = {
            venue: req.body.location,
            address: '',
            city: '',
            country: '',
            isOnline: false
          };
        }
      } else if (typeof req.body.location === 'object') {
        eventDataToSave.location = req.body.location;
      }
      console.log('📍 Location:', eventDataToSave.location);
    } catch (e) {
      console.error('Error processing location:', e);
      return sendError(res, 400, 'Invalid location format');
    }
  }

  // Handle organizer
  if (req.body.organizer) {
    try {
      if (typeof req.body.organizer === 'string') {
        try {
          eventDataToSave.organizer = JSON.parse(req.body.organizer);
        } catch (e) {
          // If not JSON, create simple organizer object
          eventDataToSave.organizer = {
            name: req.body.organizer,
            contact: '',
            email: ''
          };
        }
      } else if (typeof req.body.organizer === 'object') {
        eventDataToSave.organizer = req.body.organizer;
      }
      console.log('👥 Organizer:', eventDataToSave.organizer);
    } catch (e) {
      console.error('Error processing organizer:', e);
      return sendError(res, 400, 'Invalid organizer format');
    }
  }

  // Handle capacity
  if (req.body.capacity) {
    const capacity = parseInt(req.body.capacity);
    if (!isNaN(capacity) && capacity > 0) {
      eventDataToSave.capacity = capacity;
      console.log('📊 Capacity:', capacity);
    }
  }

  // Handle registration deadline
  if (req.body.registrationDeadline) {
    const deadline = new Date(req.body.registrationDeadline);
    if (!isNaN(deadline.getTime())) {
      eventDataToSave.registrationDeadline = deadline;
      eventDataToSave.registrationRequired = true;
      console.log('⏰ Registration deadline:', deadline);
    }
  }

  // 🔥 FIXED: Handle cover image if uploaded to Cloudinary
  if (req.file) {
    // Cloudinary returns file with these properties
    eventDataToSave.coverImage = {
      url: req.file.path,           // Cloudinary URL
      publicId: req.file.filename,  // Cloudinary public_id
      filename: req.file.originalname,
      format: req.file.mimetype.split('/')[1],
      size: req.file.size
    };
    console.log('🖼️ Cover image uploaded to Cloudinary:', req.file.path);
  } else if (req.body.coverImage) {
    // Handle cover image URL if provided as string
    eventDataToSave.coverImage = {
      url: req.body.coverImage,
      publicId: null
    };
  }

  // Add any additional fields from request
  const additionalFields = ['gallery', 'metadata', 'registrationRequired'];
  additionalFields.forEach(field => {
    if (req.body[field] !== undefined) {
      eventDataToSave[field] = req.body[field];
    }
  });

  console.log('💾 Saving event with data:', JSON.stringify(eventDataToSave, null, 2));

  // Create event
  let event;
  try {
    event = await Event.create(eventDataToSave);
    console.log('✅ Event created in database:', event._id);
  } catch (error) {
    console.error('❌ Database error creating event:', error);
    if (error.code === 11000) {
      return sendError(res, 400, 'An event with this slug already exists. Please try again.');
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return sendError(res, 400, `Validation error: ${messages.join(', ')}`);
    }
    throw error; // Let the global error handler handle it
  }
  
  // Populate createdBy for response
  try {
    await event.populate('createdBy', 'name email');
  } catch (error) {
    console.warn('⚠️ Could not populate createdBy:', error);
  }
  
  console.log('🎉 Event created successfully:', event._id);
  sendResponse(res, 201, event, 'Event created successfully');
});

const getEvents = handleAsync(async (req, res) => {
  console.log('📋 Fetching events with query:', req.query);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Apply filters
  const filters = parseFilters(req.query, ['status', 'type', 'isFeatured']);
  query = { ...query, ...filters };

  // Apply search
  if (req.query.search) {
    query = { ...query, ...parseSearch(req.query.search) };
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.startDate = {};
    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      if (!isNaN(start.getTime())) {
        query.startDate.$gte = start;
      }
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      if (!isNaN(end.getTime())) {
        query.startDate.$lte = end;
      }
    }
  }

  // Get sort
  const sort = parseSort(req.query.sort);

  console.log('🔍 Query:', JSON.stringify(query, null, 2));
  console.log('📊 Sort:', sort);

  // Execute query
  const events = await Event.find(query)
    .populate('createdBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Event.countDocuments(query);

  // Format response with pagination
  const response = formatPagination(events, page, limit, total);
  
  console.log(`✅ Found ${events.length} events (total: ${total})`);
  sendResponse(res, 200, response, 'Events retrieved successfully');
});

// @desc    Get event by ID or slug
// @route   GET /api/events/:id
// @access  Public
const getEventById = handleAsync(async (req, res) => {
  console.log('🔍 Fetching event:', req.params.id);

  const event = await Event.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  }).populate('createdBy', 'name email');

  if (!event) {
    console.log('❌ Event not found:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  console.log('✅ Event found:', event._id);
  sendResponse(res, 200, event, 'Event retrieved successfully');
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
const getUpcomingEvents = handleAsync(async (req, res) => {
  console.log('📅 Fetching upcoming events');

  const query = {
    status: 'upcoming',
    startDate: { $gte: new Date() }
  };

  const events = await Event.find(query)
    .populate('createdBy', 'name email')
    .sort('startDate')
    .limit(10);

  sendResponse(res, 200, events, 'Upcoming events retrieved successfully');
});

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
const getFeaturedEvents = handleAsync(async (req, res) => {
  console.log('⭐ Fetching featured events');

  const events = await Event.find({ isFeatured: true, status: 'upcoming' })
    .populate('createdBy', 'name email')
    .sort('startDate')
    .limit(5);

  sendResponse(res, 200, events, 'Featured events retrieved successfully');
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
const updateEvent = handleAsync(async (req, res) => {
  console.log('📝 Updating event:', req.params.id);
  console.log('Update data:', req.body);

  const event = await Event.findById(req.params.id);
  
  if (!event) {
    console.log('❌ Event not found for update:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  // Check if user has permission (admin or creator)
  if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You do not have permission to update this event');
  }

  // If title is being updated, generate new unique slug
  if (req.body.title && req.body.title !== event.title) {
    req.body.slug = await generateUniqueSlug(
      req.body.title,
      async (slug) => await Event.findOne({ slug, _id: { $ne: event._id } })
    );
  }

  // Validate dates if provided
  if (req.body.startDate || req.body.endDate) {
    const startDate = req.body.startDate ? new Date(req.body.startDate) : event.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : event.endDate;
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sendError(res, 400, 'Invalid date format');
    }
    
    if (startDate >= endDate) {
      return sendError(res, 400, 'Start date must be before end date');
    }
  }

  // Parse location if it's sent as JSON string
  if (req.body.location && typeof req.body.location === 'string') {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch (e) {
      console.error('Error parsing location:', e);
      return sendError(res, 400, 'Invalid location format');
    }
  }

  // Parse organizer if it's sent as JSON string
  if (req.body.organizer && typeof req.body.organizer === 'string') {
    try {
      req.body.organizer = JSON.parse(req.body.organizer);
    } catch (e) {
      console.error('Error parsing organizer:', e);
      return sendError(res, 400, 'Invalid organizer format');
    }
  }

  // Handle tags
  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(t => t.trim());
  }

  // Handle cover image if uploaded
  if (req.file) {
    req.body.coverImage = {
      url: req.file.path,
      publicId: req.file.filename
    };
  }

  // Update event
  Object.assign(event, req.body);
  const updatedEvent = await event.save();
  
  await updatedEvent.populate('createdBy', 'name email');

  console.log('✅ Event updated successfully:', updatedEvent._id);
  sendResponse(res, 200, updatedEvent, 'Event updated successfully');
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
const deleteEvent = handleAsync(async (req, res) => {
  console.log('🗑️ Deleting event:', req.params.id);

  const event = await Event.findById(req.params.id);
  
  if (!event) {
    console.log('❌ Event not found for deletion:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  // Check if user has permission (admin or creator)
  if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You do not have permission to delete this event');
  }

  await event.deleteOne();
  
  console.log('✅ Event deleted successfully:', req.params.id);
  sendResponse(res, 200, null, 'Event deleted successfully');
});

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Public
const registerForEvent = handleAsync(async (req, res) => {
  console.log('📝 Registering for event:', req.params.id);
  console.log('Registration data:', req.body);

  const event = await Event.findById(req.params.id);
  
  if (!event) {
    console.log('❌ Event not found for registration:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  // Check if event is available for registration
  if (event.status !== 'upcoming') {
    return sendError(res, 400, 'Event is not available for registration');
  }

  // Check if registration deadline has passed
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return sendError(res, 400, 'Registration deadline has passed');
  }

  // Check capacity
  if (event.capacity && event.registeredCount >= event.capacity) {
    return sendError(res, 400, 'Event is full');
  }

  // Validate required registration fields
  if (event.registrationRequired) {
    const requiredFields = ['name', 'email'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  // Here you would typically create a registration record in a separate collection
  // For now, we'll just increment the counter
  
  event.registeredCount += 1;
  await event.save();

  console.log('✅ Registration successful for event:', event._id);
  console.log('📊 Current registered count:', event.registeredCount);

  sendResponse(res, 200, { 
    registeredCount: event.registeredCount,
    eventId: event._id,
    eventTitle: event.title
  }, 'Registration successful');
});

// @desc    Upload event gallery images
// @route   POST /api/events/:id/gallery
// @access  Private
const uploadGallery = handleAsync(async (req, res) => {
  console.log('🖼️ Uploading gallery images for event:', req.params.id);
  console.log('Number of files:', req.files?.length);

  const event = await Event.findById(req.params.id);
  
  if (!event) {
    console.log('❌ Event not found for gallery upload:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  // Check if user has permission (admin or creator)
  if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You do not have permission to modify this event');
  }

  // Handle gallery images
  if (req.files && req.files.length > 0) {
    const galleryImages = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      caption: req.body.caption || ''
    }));
    
    // Add to existing gallery or replace
    if (req.query.replace === 'true') {
      event.gallery = galleryImages;
    } else {
      event.gallery.push(...galleryImages);
    }
    
    await event.save();
    console.log(`✅ Added ${galleryImages.length} images to gallery`);
  } else {
    console.log('⚠️ No files uploaded');
    return sendError(res, 400, 'No images uploaded');
  }

  sendResponse(res, 200, event.gallery, 'Gallery updated successfully');
});

// @desc    Remove image from gallery
// @route   DELETE /api/events/:id/gallery/:imageId
// @access  Private
const removeGalleryImage = handleAsync(async (req, res) => {
  console.log('🗑️ Removing gallery image:', req.params.imageId, 'from event:', req.params.id);

  const event = await Event.findById(req.params.id);
  
  if (!event) {
    console.log('❌ Event not found:', req.params.id);
    return sendError(res, 404, 'Event not found');
  }

  // Check if user has permission (admin or creator)
  if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You do not have permission to modify this event');
  }

  // Find and remove image
  const imageIndex = event.gallery.findIndex(img => img._id.toString() === req.params.imageId);
  
  if (imageIndex === -1) {
    return sendError(res, 404, 'Image not found');
  }

  // Here you would also delete from Cloudinary if needed
  // await deleteFromCloudinary(event.gallery[imageIndex].publicId);

  event.gallery.splice(imageIndex, 1);
  await event.save();

  console.log('✅ Gallery image removed successfully');
  sendResponse(res, 200, event.gallery, 'Image removed successfully');
});

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getUpcomingEvents,
  getFeaturedEvents,
  updateEvent,
  deleteEvent,
  registerForEvent,
  uploadGallery,
  removeGalleryImage
};