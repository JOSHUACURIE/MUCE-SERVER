// controllers/opportunity.controller.js
const Opportunity = require('../models/Opportunity');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Create opportunity
// @route   POST /api/opportunities
// @access  Private
const createOpportunity = handleAsync(async (req, res) => {
  const opportunityData = {
    ...req.body,
    slug: createSlug(req.body.title),
    createdBy: req.user._id
  };

  const existingOpportunity = await Opportunity.findOne({ slug: opportunityData.slug });
  if (existingOpportunity) {
    opportunityData.slug = `${opportunityData.slug}-${Date.now()}`;
  }

  const opportunity = await Opportunity.create(opportunityData);
  
  sendResponse(res, 201, opportunity, 'Opportunity created successfully');
});

// @desc    Get all opportunities
// @route   GET /api/opportunities
// @access  Public
const getOpportunities = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    category,
    status,
    location,
    isRemote,
    search,
    featured
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (category) query.category = category;
  if (status) query.status = status;
  if (location) query.location = { $regex: location, $options: 'i' };
  if (isRemote === 'true') query.isRemote = true;
  if (featured === 'true') query.isFeatured = true;

  if (search) {
    query.$text = { $search: search };
  }

  // Only show active opportunities with future deadlines by default
  if (!status) {
    query.status = 'active';
    query.applicationDeadline = { $gte: new Date() };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const opportunities = await Opportunity.find(query)
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-isFeatured -createdAt');

  const total = await Opportunity.countDocuments(query);

  sendResponse(res, 200, {
    opportunities,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get opportunity by ID or slug
// @route   GET /api/opportunities/:id
// @access  Public
const getOpportunityById = handleAsync(async (req, res) => {
  const opportunity = await Opportunity.findOneAndUpdate(
    {
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ]
    },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('createdBy', 'name email');

  if (!opportunity) {
    return sendError(res, 404, 'Opportunity not found');
  }

  sendResponse(res, 200, opportunity);
});

// @desc    Update opportunity
// @route   PUT /api/opportunities/:id
// @access  Private
const updateOpportunity = handleAsync(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  
  if (!opportunity) {
    return sendError(res, 404, 'Opportunity not found');
  }

  if (req.body.title && req.body.title !== opportunity.title) {
    req.body.slug = createSlug(req.body.title);
    
    const existing = await Opportunity.findOne({ 
      slug: req.body.slug,
      _id: { $ne: opportunity._id }
    });
    
    if (existing) {
      req.body.slug = `${req.body.slug}-${Date.now()}`;
    }
  }

  Object.assign(opportunity, req.body);
  const updatedOpportunity = await opportunity.save();

  sendResponse(res, 200, updatedOpportunity, 'Opportunity updated successfully');
});

// @desc    Delete opportunity
// @route   DELETE /api/opportunities/:id
// @access  Private
const deleteOpportunity = handleAsync(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  
  if (!opportunity) {
    return sendError(res, 404, 'Opportunity not found');
  }

  await opportunity.deleteOne();
  sendResponse(res, 200, null, 'Opportunity deleted successfully');
});

// @desc    Apply for opportunity
// @route   POST /api/opportunities/:id/apply
// @access  Public
const applyForOpportunity = handleAsync(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  
  if (!opportunity) {
    return sendError(res, 404, 'Opportunity not found');
  }

  if (opportunity.status !== 'active') {
    return sendError(res, 400, 'This opportunity is no longer accepting applications');
  }

  if (new Date() > opportunity.applicationDeadline) {
    return sendError(res, 400, 'Application deadline has passed');
  }

  const application = {
    ...req.body,
    appliedAt: new Date()
  };

  opportunity.applications.push(application);
  await opportunity.save();

  // Here you would typically send an email notification

  sendResponse(res, 200, null, 'Application submitted successfully');
});

// @desc    Get applications for an opportunity
// @route   GET /api/opportunities/:id/applications
// @access  Private
const getApplications = handleAsync(async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id)
    .select('title applications');

  if (!opportunity) {
    return sendError(res, 404, 'Opportunity not found');
  }

  sendResponse(res, 200, opportunity.applications);
});

module.exports = {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  applyForOpportunity,
  getApplications
};