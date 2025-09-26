const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  initiateBillPurchase,
  verifyBillPurchase,
  getTransactionHistory
} = require('../controllers/billPaymentController');

// @route   POST /api/bill/purchase/initiate
// @desc    Initiate discounted bill purchase
// @access  Private
router.post('/purchase/initiate', auth, initiateBillPurchase);

// @route   POST /api/bill/purchase/verify
// @desc    Verify bill purchase and process fulfillment
// @access  Private
router.post('/purchase/verify', auth, verifyBillPurchase);

// @route   GET /api/bill/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/transactions', auth, getTransactionHistory);

module.exports = router;
