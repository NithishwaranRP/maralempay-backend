const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getSubscriptionPlans,
  purchaseSubscription,
  verifySubscriptionPayment,
  getSubscriptionStatus,
  getSubscriptionHistory,
  manualActivateSubscription,
  updateSubscriptionStatus,
  verifySubscriptionStatus
} = require('../controllers/subscriptionController');

// All subscription routes require authentication
router.use(authenticateUser);

// Get available subscription plans
// GET /api/subscription/plans
router.get('/plans', getSubscriptionPlans);

// Purchase subscription
// POST /api/subscription/purchase
// Body: { planType }
router.post('/purchase', purchaseSubscription);

// Verify subscription payment
// GET /api/subscription/verify/:payment_ref
router.get('/verify/:payment_ref', verifySubscriptionPayment);

// Get user's subscription status
// GET /api/subscription/status
router.get('/status', getSubscriptionStatus);

// Get subscription history
// GET /api/subscription/history?page=1&limit=10
router.get('/history', getSubscriptionHistory);

// Manually activate subscription (for testing or webhook failures)
// POST /api/subscription/manual-activate
// Body: { payment_ref }
router.post('/manual-activate', manualActivateSubscription);

// Update subscription status (for mobile app)
// POST /api/subscription/update-status
// Body: { transactionId, txRef, status, paymentData }
router.post('/update-status', updateSubscriptionStatus);

// Verify subscription status
// GET /api/subscription/verify
router.get('/verify', verifySubscriptionStatus);

module.exports = router;