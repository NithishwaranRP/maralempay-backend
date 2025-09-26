const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  initiateSubscription,
  verifySubscription,
  getSubscriptionStatus
} = require('../controllers/subscriptionController');

// @route   POST /api/subscription/initiate
// @desc    Initiate subscription payment
// @access  Private
router.post('/initiate', auth, initiateSubscription);

// @route   POST /api/subscription/verify
// @desc    Verify subscription payment
// @access  Private
router.post('/verify', auth, verifySubscription);

// @route   GET /api/subscription/status
// @desc    Get subscription status
// @access  Private
router.get('/status', auth, getSubscriptionStatus);

module.exports = router;