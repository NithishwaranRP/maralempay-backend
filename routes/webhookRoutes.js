const express = require('express');
const router = express.Router();
const {
  handleFlutterwaveWebhook,
  handlePaymentWebhook,
  handleBillPaymentCallback
} = require('../controllers/webhookController');

// Webhook endpoints (no authentication required)
router.post('/flutterwave', handleFlutterwaveWebhook);
router.post('/payment', handlePaymentWebhook);
router.post('/bill-payment', handleBillPaymentCallback);

module.exports = router;