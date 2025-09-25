const express = require('express');
const router = express.Router();
const {
  buyAirtime,
  buyData,
  getTransactionHistory,
  getDataPlans,
  getTransactionStats
} = require('../controllers/transactionController');
const {
  validateAirtimePurchase,
  validateDataPurchase
} = require('../middleware/validation');
const { authenticateUser, requireSubscription } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Public data plans endpoint (no subscription required)
router.get('/data-plans', getDataPlans);

// Subscription required routes
router.use(requireSubscription);

router.post('/airtime', validateAirtimePurchase, buyAirtime);
router.post('/data', validateDataPurchase, buyData);
router.get('/history', getTransactionHistory);
router.get('/stats', getTransactionStats);

module.exports = router;