// controllers/dashboard.controller.js
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const Publication = require('../models/Publication');
const Report = require('../models/Report');
const Newsletter = require('../models/Newsletter');
const { Media } = require('../models/Media');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { handleAsync, sendResponse } = require('./base.controller');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = handleAsync(async (req, res) => {
  const [
    totalEvents,
    upcomingEvents,
    totalOpportunities,
    activeOpportunities,
    totalPublications,
    totalReports,
    totalMedia,
    totalSubscribers,
    recentActivities
  ] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: 'upcoming' }),
    Opportunity.countDocuments(),
    Opportunity.countDocuments({ status: 'active' }),
    Publication.countDocuments(),
    Report.countDocuments(),
    Media.countDocuments(),
    Subscriber.countDocuments({ isActive: true }),
    
    // Recent activities (combined from multiple collections)
    Promise.all([
      Event.find().sort('-createdAt').limit(5).select('title createdAt type'),
      Opportunity.find().sort('-createdAt').limit(5).select('title createdAt type'),
      Publication.find().sort('-createdAt').limit(5).select('title createdAt type'),
      Media.find().sort('-createdAt').limit(5).select('title createdAt type category')
    ])
  ]);

  // Format recent activities
  const activities = [
    ...recentActivities[0].map(e => ({ ...e.toObject(), model: 'Event' })),
    ...recentActivities[1].map(o => ({ ...o.toObject(), model: 'Opportunity' })),
    ...recentActivities[2].map(p => ({ ...p.toObject(), model: 'Publication' })),
    ...recentActivities[3].map(m => ({ ...m.toObject(), model: 'Media' }))
  ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  sendResponse(res, 200, {
    counts: {
      events: totalEvents,
      upcomingEvents,
      opportunities: totalOpportunities,
      activeOpportunities,
      publications: totalPublications,
      reports: totalReports,
      media: totalMedia,
      subscribers: totalSubscribers
    },
    recentActivities: activities
  });
});

// @desc    Get chart data
// @route   GET /api/dashboard/charts
// @access  Private
const getChartData = handleAsync(async (req, res) => {
  const { period = 'month' } = req.query;
  
  const now = new Date();
  let startDate;
  
  switch(period) {
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  // Get data for charts
  const [
    eventsByType,
    opportunitiesByType,
    mediaByType,
    subscribersGrowth
  ] = await Promise.all([
    Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Opportunity.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Media.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Subscriber.aggregate([
      {
        $match: {
          subscribedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscribedAt' },
            month: { $month: '$subscribedAt' },
            day: { $dayOfMonth: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])
  ]);

  sendResponse(res, 200, {
    eventsByType,
    opportunitiesByType,
    mediaByType,
    subscribersGrowth
  });
});

module.exports = {
  getDashboardStats,
  getChartData
};