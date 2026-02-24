// routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getChartData
} = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middleware/auth');

// All dashboard routes are protected and require admin access
router.use(protect, authorize('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

// Chart data
router.get('/charts', getChartData);

// Activity timeline
router.get('/activity', async (req, res) => {
  try {
    const { Event, Opportunity, Publication, Media } = require('../models');
    const limit = parseInt(req.query.limit) || 20;
    
    const [events, opportunities, publications, media] = await Promise.all([
      Event.find().sort('-createdAt').limit(limit).select('title createdAt type status'),
      Opportunity.find().sort('-createdAt').limit(limit).select('title createdAt type status'),
      Publication.find().sort('-createdAt').limit(limit).select('title createdAt type status'),
      Media.find().sort('-createdAt').limit(limit).select('title createdAt type category')
    ]);

    const activities = [
      ...events.map(e => ({ ...e.toObject(), model: 'Event' })),
      ...opportunities.map(o => ({ ...o.toObject(), model: 'Opportunity' })),
      ...publications.map(p => ({ ...p.toObject(), model: 'Publication' })),
      ...media.map(m => ({ ...m.toObject(), model: 'Media' }))
    ].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Quick stats for dashboard widgets
router.get('/quick-stats', async (req, res) => {
  try {
    const { Event, Opportunity, Subscriber, Media } = require('../models');
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [
      totalEvents,
      upcomingEvents,
      totalOpportunities,
      activeOpportunities,
      totalSubscribers,
      newSubscribersThisMonth,
      totalMedia
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ 
        status: 'upcoming',
        startDate: { $gte: now }
      }),
      Opportunity.countDocuments(),
      Opportunity.countDocuments({ status: 'active' }),
      Subscriber.countDocuments({ isActive: true }),
      Subscriber.countDocuments({ 
        subscribedAt: { $gte: startOfMonth },
        isActive: true
      }),
      Media.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        events: totalEvents,
        upcomingEvents,
        opportunities: totalOpportunities,
        activeOpportunities,
        subscribers: totalSubscribers,
        newSubscribers: newSubscribersThisMonth,
        media: totalMedia
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;