const express = require('express');
const router = express.Router();
const { checkSubscriptionStatus } = require('../controllers/webController');

// Public routes for web access
router.post('/check-subscription', checkSubscriptionStatus);

module.exports = router;
