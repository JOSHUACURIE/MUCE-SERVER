// controllers/report.controller.js
const Report = require('../models/Report');
const { handleAsync, sendResponse, sendError, createSlug } = require('./base.controller');

// @desc    Create report
// @route   POST /api/reports
// @access  Private
const createReport = handleAsync(async (req, res) => {
  const reportData = {
    ...req.body,
    slug: createSlug(req.body.title),
    createdBy: req.user._id
  };

  // Handle file upload
  if (req.file) {
    reportData.file = {
      url: req.file.path,
      filename: req.file.originalname,
      size: req.file.size
    };
  }

  // Handle cover image
  if (req.body.coverImage) {
    reportData.coverImage = {
      url: req.body.coverImage
    };
  }

  const existingReport = await Report.findOne({ slug: reportData.slug });
  if (existingReport) {
    reportData.slug = `${reportData.slug}-${Date.now()}`;
  }

  const report = await Report.create(reportData);
  
  sendResponse(res, 201, report, 'Report created successfully');
});

// @desc    Get all reports
// @route   GET /api/reports
// @access  Public
const getReports = handleAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    year,
    quarter,
    status,
    search
  } = req.query;

  const query = {};

  if (type) query.type = type;
  if (year) query.year = parseInt(year);
  if (quarter) query.quarter = quarter;
  if (status) query.status = status;

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reports = await Report.find(query)
    .populate('createdBy', 'name email')
    .populate('relatedProject', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort('-year -createdAt');

  const total = await Report.countDocuments(query);

  sendResponse(res, 200, {
    reports,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    total
  });
});

// @desc    Get report by ID or slug
// @route   GET /api/reports/:id
// @access  Public
const getReportById = handleAsync(async (req, res) => {
  const report = await Report.findOne({
    $or: [
      { _id: req.params.id },
      { slug: req.params.id }
    ]
  })
  .populate('createdBy', 'name email')
  .populate('relatedProject', 'name description');

  if (!report) {
    return sendError(res, 404, 'Report not found');
  }

  sendResponse(res, 200, report);
});

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
const updateReport = handleAsync(async (req, res) => {
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return sendError(res, 404, 'Report not found');
  }

  if (req.body.title && req.body.title !== report.title) {
    req.body.slug = createSlug(req.body.title);
    
    const existing = await Report.findOne({ 
      slug: req.body.slug,
      _id: { $ne: report._id }
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
      size: req.file.size
    };
  }

  Object.assign(report, req.body);
  const updatedReport = await report.save();

  sendResponse(res, 200, updatedReport, 'Report updated successfully');
});

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
const deleteReport = handleAsync(async (req, res) => {
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return sendError(res, 404, 'Report not found');
  }

  await report.deleteOne();
  sendResponse(res, 200, null, 'Report deleted successfully');
});

// @desc    Download report
// @route   GET /api/reports/:id/download
// @access  Public
const downloadReport = handleAsync(async (req, res) => {
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return sendError(res, 404, 'Report not found');
  }

  report.downloadCount += 1;
  await report.save();

  if (report.file && report.file.url) {
    return res.redirect(report.file.url);
  }

  sendError(res, 404, 'File not found');
});

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  downloadReport
};