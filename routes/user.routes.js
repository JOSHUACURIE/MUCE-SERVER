// routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protect, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

router.put('/profile', protect, upload.single('profileImage'), updateProfile);

// Admin only routes
router.route('/')
  .get(protect, authorize('admin'), getUsers);

router.route('/:id')
  .get(protect, authorize('admin'), getUserById)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

module.exports = router;