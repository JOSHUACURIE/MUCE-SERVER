// controllers/newsletter.controller.js
const Newsletter = require('../models/Newsletter');
const Subscriber = require('../models/Subscriber');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Create newsletter
// @route   POST /api/newsletters
// @access  Private
const createNewsletter = handleAsync(async (req, res) => {
  const newsletterData = {
    ...req.body,
    slug: createSlug(req.body.title),
    createdBy: req.user._id
  };

  // Handle featured image
  if (req.file) {
    newsletterData.featuredImage = {
      url: req.file.path
    };
  }

  const existingNewsletter = await Newsletter.findOne({ slug: newsletterData.slug });
  if (existingNewsletter) {
    newsletterData.slug = `${newsletterData.slug}-${Date.now()}`;
  }

  const newsletter = await Newsletter.create(newsletterData);
  
  sendResponse(res, 201, newsletter, 'Newsletter created successfully');
});

// @desc    Get all newsletters
// @route   GET /api/newsletters
// @access  Public
const getNewsletters = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    search
  } = req.query;

  const query = {};

  if (status) query.status = status;

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const newsletters = await Newsletter.find(query)
    .populate('createdBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-createdAt');

  const total = await Newsletter.countDocuments(query);

  sendResponse(res, 200, {
    newsletters,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get newsletter by ID or slug
// @route   GET /api/newsletters/:id
// @access  Public
const getNewsletterById = handleAsync(async (req, res) => {
  const newsletter = await Newsletter.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  }).populate('createdBy', 'name email');

  if (!newsletter) {
    return sendError(res, 404, 'Newsletter not found');
  }

  sendResponse(res, 200, newsletter);
});

// @desc    Update newsletter
// @route   PUT /api/newsletters/:id
// @access  Private
const updateNewsletter = handleAsync(async (req, res) => {
  const newsletter = await Newsletter.findById(req.params.id);
  
  if (!newsletter) {
    return sendError(res, 404, 'Newsletter not found');
  }

  if (req.body.title && req.body.title !== newsletter.title) {
    req.body.slug = createSlug(req.body.title);
    
    const existing = await Newsletter.findOne({ 
      slug: req.body.slug,
      _id: { $ne: newsletter._id }
    });
    
    if (existing) {
      req.body.slug = `${req.body.slug}-${Date.now()}`;
    }
  }

  // Handle new featured image
  if (req.file) {
    req.body.featuredImage = {
      url: req.file.path
    };
  }

  Object.assign(newsletter, req.body);
  const updatedNewsletter = await newsletter.save();

  sendResponse(res, 200, updatedNewsletter, 'Newsletter updated successfully');
});

// @desc    Delete newsletter
// @route   DELETE /api/newsletters/:id
// @access  Private
const deleteNewsletter = handleAsync(async (req, res) => {
  const newsletter = await Newsletter.findById(req.params.id);
  
  if (!newsletter) {
    return sendError(res, 404, 'Newsletter not found');
  }

  await newsletter.deleteOne();
  sendResponse(res, 200, null, 'Newsletter deleted successfully');
});

// @desc    Send newsletter to subscribers
// @route   POST /api/newsletters/:id/send
// @access  Private
const sendNewsletter = handleAsync(async (req, res) => {
  const newsletter = await Newsletter.findById(req.params.id);
  
  if (!newsletter) {
    return sendError(res, 404, 'Newsletter not found');
  }

  // Get active subscribers
  const subscribers = await Subscriber.find({ isActive: true });
  
  newsletter.recipients = subscribers.length;
  newsletter.status = 'sent';
  newsletter.sentDate = new Date();
  
  await newsletter.save();

  // Here you would integrate with an email service to actually send the newsletter
  // For example: nodemailer, sendgrid, etc.

  sendResponse(res, 200, {
    recipients: subscribers.length,
    newsletter
  }, 'Newsletter sent successfully');
});

// @desc    Get newsletter stats
// @route   GET /api/newsletters/stats
// @access  Private
const getNewsletterStats = handleAsync(async (req, res) => {
  const totalSubscribers = await Subscriber.countDocuments({ isActive: true });
  const totalNewsletters = await Newsletter.countDocuments();
  const sentNewsletters = await Newsletter.countDocuments({ status: 'sent' });
  
  const recentNewsletters = await Newsletter.find({ status: 'sent' })
    .sort('-sentDate')
    .limit(5)
    .select('title sentDate recipients openRate clickRate');

  sendResponse(res, 200, {
    totalSubscribers,
    totalNewsletters,
    sentNewsletters,
    recentNewsletters
  });
});

module.exports = {
  createNewsletter,
  getNewsletters,
  getNewsletterById,
  updateNewsletter,
  deleteNewsletter,
  sendNewsletter,
  getNewsletterStats
};