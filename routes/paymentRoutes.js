const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  initializePayment,
  verifyPayment,
  getPaymentStatus,
  getPaymentHistory
} = require('../controllers/paymentController');

// All payment routes require authentication
router.use(authenticateUser);

// Initialize payment
router.post('/initialize', initializePayment);

// Verify payment
router.post('/verify', verifyPayment);

// Get payment status
router.get('/status/:reference', getPaymentStatus);

// Get payment history
router.get('/history', getPaymentHistory);

module.exports = router;
