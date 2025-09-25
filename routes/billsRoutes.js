const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getBillCategories,
  getBillItemsForBiller,
  getBillItems,
  createBillPayment,
  createAirtimePurchase,
  verifyBillPayment,
  getBillHistory,
  getTransactionDetails,
  handlePaymentCallback,
  retryPendingPayments,
  handleFlutterwaveWebhook,
  getBillPaymentStatus,
  debugBillerCode
} = require('../controllers/billsController');

// Get bill categories (public route - no authentication required)
// GET /api/bills/categories?type=airtime (get airtime categories)
// GET /api/bills/categories?type=data (get data categories)
// GET /api/bills/categories (get all categories)
router.get('/categories', getBillCategories);

// Flutterwave webhook endpoint (public route - no authentication)
// POST /api/bills/webhook
router.post('/webhook', handleFlutterwaveWebhook);

// All other bills routes require authentication
router.use(authenticateUser);

// Get bill items for a specific biller (data plans, airtime amounts, etc.)
// GET /api/bills/items/BIL108 (get MTN data plans)
// GET /api/bills/items/BIL109 (get Airtel data plans)
router.get('/items/:biller_code', getBillItemsForBiller);

// Legacy endpoint for backward compatibility
// GET /api/bills?category=1 (get billers for category)
// GET /api/bills?biller_code=BIL108 (get items for biller)
// GET /api/bills (get all categories)
router.get('/', getBillItems);

// Create airtime purchase session (simplified endpoint)
router.post('/airtime', createAirtimePurchase);

// Create bill payment session and return hosted link
router.post('/pay', createBillPayment);

// Verify bill payment transaction
router.get('/verify/:tx_ref', verifyBillPayment);

// Handle payment callback (webhook alternative)
router.get('/callback/:transaction_id', handlePaymentCallback);

// Retry pending payments (admin or cron job)
router.post('/retry-pending', retryPendingPayments);

// Get user's bill payment history
router.get('/history', getBillHistory);

// Get transaction details
router.get('/transaction/:transaction_id', getTransactionDetails);

// Get enhanced bill payment status
// GET /api/bills/status/:tx_ref
router.get('/status/:tx_ref', getBillPaymentStatus);

// Debug endpoint to test biller codes (development only)
// GET /api/bills/debug/:billerCode
router.get('/debug/:billerCode', debugBillerCode);

module.exports = router;