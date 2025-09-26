const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  initializeSubscription,
  verifySubscription,
  verifySubscriptionStatus,
  verifyEmail,
  resetPassword
} = require('../controllers/authController');
const {
  validateUserRegistration,
  validateUserLogin,
  validateEmailVerification,
  validatePasswordReset
} = require('../middleware/validation');
const { authenticateUser } = require('../middleware/auth');

// Public routes
router.post('/register', validateUserRegistration, registerUser);
router.post('/login', validateUserLogin, loginUser);
router.post('/verify-email', validateEmailVerification, verifyEmail);
router.post('/reset-password', validatePasswordReset, resetPassword);

// Protected routes
router.use(authenticateUser); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/subscription/initialize', initializeSubscription);
router.post('/subscription/verify', verifySubscription);
router.get('/subscription/status', verifySubscriptionStatus);

module.exports = router;
