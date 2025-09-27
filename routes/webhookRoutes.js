const express = require('express');
const router = express.Router();
const { handleFlutterwaveWebhook, verifyTransaction } = require('../controllers/webhookController');
const { authenticateToken } = require('../middleware/auth');

// Flutterwave webhook endpoint (no auth required)
router.post('/flutterwave', handleFlutterwaveWebhook);

// Transaction verification endpoint (auth required)
router.get('/verify/:tx_ref', authenticateToken, verifyTransaction);

module.exports = router;