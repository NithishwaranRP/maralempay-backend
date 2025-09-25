const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { 
  verifyPayment, 
  getPaymentStatus 
} = require('../controllers/paymentVerificationController');

// All payment verification routes require authentication
router.use(authenticateUser);

// Payment verification endpoint
// POST /api/payment/verify
router.post('/verify', verifyPayment);

// Get payment status
// GET /api/payment/status/:tx_ref
router.get('/status/:tx_ref', getPaymentStatus);

module.exports = router;
