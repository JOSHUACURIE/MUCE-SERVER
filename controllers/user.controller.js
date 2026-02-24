// controllers/user.controller.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { handleAsync, sendResponse, sendError } = require('./base.controller');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
const registerUser = handleAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return sendError(res, 400, 'User already exists');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: 'editor' // Default role
  });

  // Generate token
  const token = generateToken(user._id);

  sendResponse(res, 201, {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  }, 'User registered successfully');
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    return sendError(res, 401, 'Invalid email or password');
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  sendResponse(res, 200, {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  }, 'Login successful');
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = handleAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find({})
    .select('-password')
    .skip(skip)
    .limit(limit)
    .sort('-createdAt');

  const total = await User.countDocuments();

  sendResponse(res, 200, {
    users,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = handleAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  sendResponse(res, 200, user);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = handleAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const { name, email, role, isActive } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.role = role || user.role;
  user.isActive = isActive !== undefined ? isActive : user.isActive;

  const updatedUser = await user.save();

  sendResponse(res, 200, {
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isActive: updatedUser.isActive
  }, 'User updated successfully');
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = handleAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  await user.deleteOne();
  sendResponse(res, 200, null, 'User deleted successfully');
});

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = handleAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const { name, email, password } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  
  if (password) {
    user.password = password;
  }

  const updatedUser = await user.save();

  sendResponse(res, 200, {
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role
  }, 'Profile updated successfully');
});

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile
};