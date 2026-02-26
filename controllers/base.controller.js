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

/**
 * Create a URL-friendly slug from a string
 * @param {string} title - The text to convert to slug
 * @param {object} options - Optional configuration
 * @param {boolean} options.lowercase - Convert to lowercase (default: true)
 * @param {string} options.replacement - Replacement for spaces (default: '-')
 * @param {boolean} options.removeStopWords - Remove common stop words (default: false)
 * @returns {string} - The generated slug
 */
const createSlug = (title, options = {}) => {
  // Default options
  const {
    lowercase = true,
    replacement = '-',
    removeStopWords = false
  } = options;

  // Handle undefined, null, or non-string input
  if (!title) {
    console.warn('createSlug received undefined or null title');
    // Generate a random slug based on timestamp
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  if (typeof title !== 'string') {
    console.warn(`createSlug received non-string title: ${typeof title}`);
    // Convert to string if possible
    title = String(title);
  }

  // Trim whitespace
  let slug = title.trim();

  // Check if after trimming it's empty
  if (!slug) {
    return `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Optional: Remove common stop words
  if (removeStopWords) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = slug.split(' ');
    slug = words.filter(word => !stopWords.includes(word.toLowerCase())).join(' ');
  }

  // Convert to lowercase if specified
  if (lowercase) {
    slug = slug.toLowerCase();
  }

  // Replace special characters
  slug = slug
    // Replace spaces and special characters with replacement
    .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, replacement) // Replace spaces with replacement
    .replace(/--+/g, replacement) // Replace multiple hyphens with single
    .replace(new RegExp(`^${replacement}|${replacement}$`, 'g'), ''); // Trim replacement from ends

  // If after all processing the slug is empty, generate a random one
  if (!slug) {
    slug = `post-${Date.now()}`;
  }

  return slug;
};

/**
 * Generate a unique slug by checking against existing slugs in a collection
 * @param {string} title - The title to create slug from
 * @param {Function} checkFunction - Async function to check if slug exists
 * @param {object} options - Options for createSlug
 * @returns {Promise<string>} - Unique slug
 */
const generateUniqueSlug = async (title, checkFunction, options = {}) => {
  let slug = createSlug(title, options);
  let finalSlug = slug;
  let counter = 1;

  // Keep checking until we find a unique slug
  while (await checkFunction(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
};

/**
 * Format pagination response
 * @param {Array} data - The paginated data
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} - Formatted pagination response
 */
const formatPagination = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrev: parseInt(page) > 1
    }
  };
};

/**
 * Parse query parameters for filtering
 * @param {object} query - Express query object
 * @param {Array} allowedFields - Fields allowed for filtering
 * @returns {object} - Parsed filter object
 */
const parseFilters = (query, allowedFields = []) => {
  const filters = {};
  
  Object.keys(query).forEach(key => {
    // Skip pagination and special params
    if (['page', 'limit', 'sort', 'fields', 'search'].includes(key)) {
      return;
    }
    
    // Check if field is allowed
    if (allowedFields.length === 0 || allowedFields.includes(key)) {
      // Handle special operators
      if (typeof query[key] === 'string' && query[key].includes(',')) {
        filters[key] = { $in: query[key].split(',') };
      } else {
        filters[key] = query[key];
      }
    }
  });
  
  return filters;
};

/**
 * Parse search query for text search
 * @param {string} searchTerm - Search term
 * @returns {object} - MongoDB text search object
 */
const parseSearch = (searchTerm) => {
  if (!searchTerm) return {};
  
  return {
    $text: { $search: searchTerm }
  };
};


/**
 * Parse sort parameter
 * @param {string} sortParam - Sort parameter (e.g., '-createdAt,name')
 * @returns {object} - MongoDB sort object
 */
const parseSort = (sortParam) => {
  if (!sortParam) return { createdAt: -1 };
  
  const sort = {};
  const fields = sortParam.split(',');
  
  fields.forEach(field => {
    if (field.startsWith('-')) {
      sort[field.substring(1)] = -1;
    } else {
      sort[field] = 1;
    }
  });
  
  return sort;
};

module.exports = {
  handleAsync,
  sendResponse,
  sendError,
  createSlug,
  generateUniqueSlug,
  formatPagination,
  parseFilters,
  parseSearch,
  parseSort
};