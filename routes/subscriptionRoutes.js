const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controller functions individually to catch any undefined imports
let initiateSubscription, verifySubscription, getSubscriptionStatus;

try {
  const controller = require('../controllers/subscriptionController');
  
  // Log what's actually exported
  console.log('✅ Subscription controller exports:', Object.keys(controller));
  
  // Destructure with error checking
  initiateSubscription = controller.initiateSubscription;
  verifySubscription = controller.verifySubscription;
  getSubscriptionStatus = controller.getSubscriptionStatus;
  
  // Verify all functions are defined
  if (typeof initiateSubscription !== 'function') {
    throw new Error('initiateSubscription is not a function: ' + typeof initiateSubscription);
  }
  if (typeof verifySubscription !== 'function') {
    throw new Error('verifySubscription is not a function: ' + typeof verifySubscription);
  }
  if (typeof getSubscriptionStatus !== 'function') {
    throw new Error('getSubscriptionStatus is not a function: ' + typeof getSubscriptionStatus);
  }
  
  console.log('✅ All subscription controller functions verified');
  
} catch (error) {
  console.error('❌ Error importing subscription controller:', error.message);
  console.error('Stack:', error.stack);
  
  // Create fallback functions to prevent server crash
  initiateSubscription = (req, res) => {
    res.status(500).json({ success: false, message: 'Controller import error' });
  };
  verifySubscription = (req, res) => {
    res.status(500).json({ success: false, message: 'Controller import error' });
  };
  getSubscriptionStatus = (req, res) => {
    res.status(500).json({ success: false, message: 'Controller import error' });
  };
}

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