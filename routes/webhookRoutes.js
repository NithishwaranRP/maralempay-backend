const express = require('express');
const router = express.Router();
const { handleFlutterwaveWebhook } = require('../controllers/webhookController');
const { authenticateToken } = require('../middleware/auth');

// Flutterwave webhook endpoint (no auth required)
router.post('/flutterwave', handleFlutterwaveWebhook);

// Simple transaction verification endpoint (auth required)
router.get('/verify/:tx_ref', authenticateToken, async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const user = req.user;
    
    console.log(`🔍 Verifying transaction: ${tx_ref} for user: ${user.email}`);
    
    // Find transaction
    const Transaction = require('../models/Transaction');
    const transaction = await Transaction.findOne({ 
      tx_ref,
      userId: user._id.toString()
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        status: transaction.status,
        amount: transaction.userAmount,
        tx_ref: transaction.tx_ref,
        flw_ref: transaction.flw_ref
      }
    });
    
  } catch (error) {
    console.error('❌ Transaction verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Transaction verification failed'
    });
  }
});

module.exports = router;