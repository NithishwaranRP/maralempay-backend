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
const { authenticateUser, checkDiscountEligibility } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateUser);

// Public data plans endpoint (no subscription required)
router.get('/data-plans', getDataPlans);

// Routes that check discount eligibility but allow full-price purchases
router.post('/airtime', checkDiscountEligibility, validateAirtimePurchase, buyAirtime);
router.post('/data', checkDiscountEligibility, validateDataPurchase, buyData);
router.get('/history', getTransactionHistory);
router.get('/stats', getTransactionStats);

module.exports = router;