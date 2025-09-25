const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getWalletInfo,
  fundWallet,
  verifyWalletFunding,
  getWalletTransactions,
  processWalletPayment
} = require('../controllers/walletController');

// All wallet routes require authentication
router.use(authenticateUser);

// Get wallet information
router.get('/info', getWalletInfo);

// Fund wallet
router.post('/fund', fundWallet);

// Verify wallet funding
router.post('/fund/verify', verifyWalletFunding);

// Get wallet transactions
router.get('/transactions', getWalletTransactions);

// Process wallet payment for airtime/data
router.post('/pay', processWalletPayment);

module.exports = router;