const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  initiateBillPayment,
  verifyBillPayment,
  getTransactionHistory
} = require('../controllers/billPaymentController');

// All bill payment routes require authentication
router.use(authenticateUser);

// Initiate discounted bill payment
// POST /api/bill/purchase/initiate
// Body: { billerCode, itemCode, customerId, amount, productName, productType }
router.post('/purchase/initiate', initiateBillPayment);

// Verify bill payment and process fulfillment
// POST /api/bill/purchase/verify
// Body: { txRef }
router.post('/purchase/verify', verifyBillPayment);

// Get user's transaction history
// GET /api/bill/transactions?page=1&limit=10
router.get('/transactions', getTransactionHistory);

module.exports = router;
