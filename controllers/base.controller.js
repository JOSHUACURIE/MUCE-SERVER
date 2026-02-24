// controllers/base.controller.js
const handleAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

const sendResponse = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, statusCode, error, details = null) => {
  res.status(statusCode).json({
    success: false,
    message: error,
    details
  });
};

const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

module.exports = {
  handleAsync,
  sendResponse,
  sendError,
  createSlug
};