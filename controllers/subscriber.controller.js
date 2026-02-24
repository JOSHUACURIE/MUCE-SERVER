// controllers/subscriber.controller.js
const Subscriber = require('../models/Subscriber');
const { handleAsync, sendResponse, sendError } = require('./base.controller');

// @desc    Subscribe to newsletter
// @route   POST /api/subscribers
// @access  Public
const subscribe = handleAsync(async (req, res) => {
  const { email, name, preferences } = req.body;

  // Check if already subscribed
  let subscriber = await Subscriber.findOne({ email });
  
  if (subscriber) {
    if (!subscriber.isActive) {
      // Reactivate subscription
      subscriber.isActive = true;
      subscriber.unsubscribedAt = null;
      await subscriber.save();
      
      return sendResponse(res, 200, subscriber, 'Subscription reactivated successfully');
    }
    
    return sendError(res, 400, 'Email already subscribed');
  }

  // Create new subscriber
  subscriber = await Subscriber.create({
    email,
    name,
    preferences,
    source: req.body.source || 'website'
  });

  sendResponse(res, 201, subscriber, 'Successfully subscribed to newsletter');
});

// @desc    Unsubscribe from newsletter
// @route   POST /api/subscribers/unsubscribe
// @access  Public
const unsubscribe = handleAsync(async (req, res) => {
  const { email } = req.body;

  const subscriber = await Subscriber.findOne({ email });
  
  if (!subscriber) {
    return sendError(res, 404, 'Subscriber not found');
  }

  subscriber.isActive = false;
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  sendResponse(res, 200, null, 'Successfully unsubscribed');
});

// @desc    Get all subscribers
// @route   GET /api/subscribers
// @access  Private
const getSubscribers = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    isActive,
    search
  } = req.query;

  const query = {};
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const subscribers = await Subscriber.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-subscribedAt');

  const total = await Subscriber.countDocuments(query);
  const activeCount = await Subscriber.countDocuments({ isActive: true });

  sendResponse(res, 200, {
    subscribers,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total,
    activeCount
  });
});

// @desc    Update subscriber preferences
// @route   PUT /api/subscribers/:id
// @access  Private
const updateSubscriber = handleAsync(async (req, res) => {
  const subscriber = await Subscriber.findById(req.params.id);
  
  if (!subscriber) {
    return sendError(res, 404, 'Subscriber not found');
  }

  const { name, preferences, isActive } = req.body;

  subscriber.name = name || subscriber.name;
  subscriber.preferences = preferences || subscriber.preferences;
  subscriber.isActive = isActive !== undefined ? isActive : subscriber.isActive;

  if (isActive === false && !subscriber.unsubscribedAt) {
    subscriber.unsubscribedAt = new Date();
  } else if (isActive === true) {
    subscriber.unsubscribedAt = null;
  }

  const updatedSubscriber = await subscriber.save();

  sendResponse(res, 200, updatedSubscriber, 'Subscriber updated successfully');
});

// @desc    Delete subscriber
// @route   DELETE /api/subscribers/:id
// @access  Private
const deleteSubscriber = handleAsync(async (req, res) => {
  const subscriber = await Subscriber.findById(req.params.id);
  
  if (!subscriber) {
    return sendError(res, 404, 'Subscriber not found');
  }

  await subscriber.deleteOne();
  sendResponse(res, 200, null, 'Subscriber deleted successfully');
});

// @desc    Export subscribers
// @route   GET /api/subscribers/export
// @access  Private
const exportSubscribers = handleAsync(async (req, res) => {
  const subscribers = await Subscriber.find({ isActive: true })
    .select('email name subscribedAt preferences')
    .sort('-subscribedAt');

  // Format for CSV export
  const csvData = subscribers.map(sub => ({
    Email: sub.email,
    Name: sub.name || '',
    'Subscribed Date': sub.subscribedAt.toISOString().split('T')[0],
    'Preferences': sub.preferences?.categories?.join(', ') || '',
    'Frequency': sub.preferences?.frequency || 'monthly'
  }));

  sendResponse(res, 200, csvData, 'Subscribers exported successfully');
});

module.exports = {
  subscribe,
  unsubscribe,
  getSubscribers,
  updateSubscriber,
  deleteSubscriber,
  exportSubscribers
};