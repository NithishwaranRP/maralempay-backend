const express = require('express');
const router = express.Router();
const FlutterwaveAirtimeController = require('../controllers/flutterwaveAirtimeController');

// Initialize controller
const flutterwaveController = new FlutterwaveAirtimeController();

// GET /api/flutterwave/categories
// Proxy to Flutterwave GET /v3/top-bill-categories
router.get('/categories', (req, res) => {
  flutterwaveController.getBillCategories(req, res);
});

// GET /api/flutterwave/billers/:categoryCode
// Fetch billers for a specific category
router.get('/billers/:categoryCode', (req, res) => {
  flutterwaveController.getBillersByCategory(req, res);
});

// GET /api/flutterwave/billers/:billerCode/items
// Proxy to GET /v3/billers/{billerCode}/items to fetch items/plans
router.get('/billers/:billerCode/items', (req, res) => {
  flutterwaveController.getBillerItems(req, res);
});

// POST /api/payments/initialize-airtime
// Initialize airtime payment with Flutterwave Checkout
router.post('/initialize-airtime', (req, res) => {
  flutterwaveController.initializeAirtimePayment(req, res);
});

// POST /api/payments/verify
// Verify payment and deliver bill
router.post('/verify', (req, res) => {
  flutterwaveController.verifyPayment(req, res);
});

// POST /api/payments/flutterwave-webhook
// Handle Flutterwave webhook events
router.post('/flutterwave-webhook', (req, res) => {
  flutterwaveController.handleWebhook(req, res);
});

// GET /api/payments/status/:tx_ref
// Get payment status for mobile polling
router.get('/status/:tx_ref', (req, res) => {
  flutterwaveController.getPaymentStatus(req, res);
});

// GET /api/payments/flutterwave-callback
// Handle Flutterwave redirect callback
router.get('/flutterwave-callback', (req, res) => {
  const { status, tx_ref, transaction_id } = req.query;
  
  console.log('🔔 Flutterwave callback received:', {
    status,
    tx_ref,
    transaction_id
  });

  // Redirect to mobile app with deep link or show success page
  const mobileDeepLink = `yourapp://payment/callback?status=${status}&tx_ref=${tx_ref}&transaction_id=${transaction_id}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Processing</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: green; }
        .error { color: red; }
        .loading { color: blue; }
      </style>
    </head>
    <body>
      <h1>Payment ${status === 'successful' ? 'Successful' : 'Processing'}</h1>
      <p>Transaction Reference: ${tx_ref}</p>
      <p>Status: ${status}</p>
      <p>Please return to the app to complete the process.</p>
      <script>
        // Try to redirect to mobile app
        setTimeout(() => {
          window.location.href = '${mobileDeepLink}';
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
