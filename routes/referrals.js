const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getReferralStats,
  getRecentReferrals,
  getAllReferrals
} = require('../controllers/referralController');

// All referral routes require authentication
router.use(authenticateUser);

// Get referral statistics
router.get('/stats', getReferralStats);

// Get recent referrals
router.get('/recent', getRecentReferrals);

// Get all referrals
router.get('/', getAllReferrals);

module.exports = router;

