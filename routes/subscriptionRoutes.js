const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  initiateSubscription,
  verifySubscription,
  getSubscriptionStatus,
  cancelSubscription
} = require('../controllers/subscriptionController');

// All subscription routes require authentication
router.use(authenticateUser);

// Initiate subscription payment
// POST /api/user/subscribe/initiate
router.post('/initiate', initiateSubscription);

// Verify subscription payment
// POST /api/user/subscribe/verify
// Body: { txRef }
router.post('/verify', verifySubscription);

// Get user's subscription status
// GET /api/user/subscription/status
router.get('/status', getSubscriptionStatus);

// Cancel subscription
// POST /api/user/subscription/cancel
router.post('/cancel', cancelSubscription);

module.exports = router;