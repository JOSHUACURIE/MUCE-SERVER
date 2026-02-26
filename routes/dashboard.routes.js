// routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getChartData
} = require('../controllers/dashboard.controller');
const { protect, authorize } = require('../middleware/auth');
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const Publication = require('../models/Publication');
const { Media } = require('../models/Media');

// All dashboard routes are protected and require admin access
router.use(protect, authorize('admin'));

// Dashboard stats
router.get('/stats', getDashboardStats);

// Chart data
router.get('/charts', getChartData);

// Activity timeline - FIXED VERSION
router.get('/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    console.log('📊 Fetching activity timeline, limit:', limit);
    
    // Fetch data from all collections with error handling for each
    let events = [], opportunities = [], publications = [], media = [];
    
    try {
      events = await Event.find()
        .sort('-createdAt')
        .limit(limit)
        .select('title createdAt type status')
        .lean()
        .catch(err => {
          console.error('Error fetching events:', err.message);
          return [];
        });
    } catch (err) {
      console.error('Events fetch failed:', err.message);
    }
    
    try {
      opportunities = await Opportunity.find()
        .sort('-createdAt')
        .limit(limit)
        .select('title createdAt type status')
        .lean()
        .catch(err => {
          console.error('Error fetching opportunities:', err.message);
          return [];
        });
    } catch (err) {
      console.error('Opportunities fetch failed:', err.message);
    }
    
    try {
      publications = await Publication.find()
        .sort('-createdAt')
        .limit(limit)
        .select('title createdAt type status')
        .lean()
        .catch(err => {
          console.error('Error fetching publications:', err.message);
          return [];
        });
    } catch (err) {
      console.error('Publications fetch failed:', err.message);
    }
    
    try {
      media = await Media.find()
        .sort('-createdAt')
        .limit(limit)
        .select('title createdAt type category')
        .lean()
        .catch(err => {
          console.error('Error fetching media:', err.message);
          return [];
        });
    } catch (err) {
      console.error('Media fetch failed:', err.message);
    }

    console.log(`📦 Found: ${events.length} events, ${opportunities.length} opportunities, ${publications.length} publications, ${media.length} media`);

    // Combine and format activities
    const activities = [
      ...events.map(e => ({ 
        ...e, 
        model: 'Event',
        icon: '🎉',
        color: 'blue'
      })),
      ...opportunities.map(o => ({ 
        ...o, 
        model: 'Opportunity',
        icon: '💼',
        color: 'green'
      })),
      ...publications.map(p => ({ 
        ...p, 
        model: 'Publication',
        icon: '📚',
        color: 'purple'
      })),
      ...media.map(m => ({ 
        ...m, 
        model: 'Media',
        icon: '🖼️',
        color: 'orange'
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);

    console.log(`✅ Returning ${activities.length} activities`);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ Activity timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity timeline',
      error: error.message
    });
  }
});

// Quick stats for dashboard widgets - FIXED VERSION
router.get('/quick-stats', async (req, res) => {
  try {
    console.log('📊 Fetching quick stats...');
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    
    // Fetch all stats with individual error handling
    let totalEvents = 0, upcomingEvents = 0, totalOpportunities = 0;
    let activeOpportunities = 0, totalSubscribers = 0, newSubscribers = 0;
    let totalMedia = 0, totalPublications = 0, totalReports = 0;
    
    try {
      totalEvents = await Event.countDocuments() || 0;
      upcomingEvents = await Event.countDocuments({ 
        status: 'upcoming',
        startDate: { $gte: now }
      }) || 0;
    } catch (err) {
      console.error('Error counting events:', err.message);
    }
    
    try {
      totalOpportunities = await Opportunity.countDocuments() || 0;
      activeOpportunities = await Opportunity.countDocuments({ 
        status: 'active',
        applicationDeadline: { $gte: now }
      }) || 0;
    } catch (err) {
      console.error('Error counting opportunities:', err.message);
    }
    
    try {
      // Assuming you have a Subscriber model
      const Subscriber = require('../models/Subscriber');
      totalSubscribers = await Subscriber.countDocuments({ isActive: true }) || 0;
      newSubscribers = await Subscriber.countDocuments({ 
        subscribedAt: { $gte: startOfMonth },
        isActive: true
      }) || 0;
    } catch (err) {
      console.error('Error counting subscribers:', err.message);
      // If Subscriber model doesn't exist, just use 0
    }
    
    try {
      totalMedia = await Media.countDocuments() || 0;
    } catch (err) {
      console.error('Error counting media:', err.message);
    }
    
    try {
      totalPublications = await Publication.countDocuments() || 0;
    } catch (err) {
      console.error('Error counting publications:', err.message);
    }
    
    try {
      const Report = require('../models/Report');
      totalReports = await Report.countDocuments() || 0;
    } catch (err) {
      console.error('Error counting reports:', err.message);
    }

    const stats = {
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        thisWeek: await getCountSince(Event, startOfWeek) || 0
      },
      opportunities: {
        total: totalOpportunities,
        active: activeOpportunities,
        thisWeek: await getCountSince(Opportunity, startOfWeek) || 0
      },
      publications: {
        total: totalPublications,
        thisWeek: await getCountSince(Publication, startOfWeek) || 0
      },
      reports: {
        total: totalReports,
        thisWeek: 0
      },
      subscribers: {
        total: totalSubscribers,
        newThisMonth: newSubscribers,
        thisWeek: 0
      },
      media: {
        total: totalMedia,
        thisWeek: await getCountSince(Media, startOfWeek) || 0
      }
    };

    console.log('✅ Quick stats retrieved:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quick stats',
      error: error.message
    });
  }
});

// Helper function to get count since a date
async function getCountSince(model, date) {
  try {
    return await model.countDocuments({ createdAt: { $gte: date } }) || 0;
  } catch (err) {
    console.error(`Error counting ${model.modelName} since ${date}:`, err.message);
    return 0;
  }
}

module.exports = router;