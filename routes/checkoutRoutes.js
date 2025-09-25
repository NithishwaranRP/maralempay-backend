const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  initializePayment,
  verifyPayment,
  getPaymentStatus
} = require('../controllers/checkoutController');

// All checkout routes require authentication
router.use(authenticateUser);

// Get payment status
router.get('/status/:tx_ref', getPaymentStatus);

// Initialize payment
router.post('/initialize', initializePayment);

// Verify payment
router.post('/verify', verifyPayment);

module.exports = router;