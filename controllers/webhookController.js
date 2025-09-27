const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const WalletTransaction = require('../models/WalletTransaction');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Verify Flutterwave webhook signature
 */
const verifyWebhookSignature = (payload, signature, secretHash) => {
  try {
    const hash = crypto
      .createHmac('sha256', secretHash)
      .update(payload, 'utf8')
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Handle Flutterwave webhook events
 */
const handleFlutterwaveWebhook = async (req, res) => {
  try {
    console.log('🔔 Webhook received:', req.body);
    
    const signature = req.headers['verif-hash'] || req.headers['flutterwave-signature'];
    const secretHash = process.env.FLW_SECRET_HASH;
    
    if (!secretHash) {
      console.error('❌ FLW_SECRET_HASH not configured');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }
    
    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    if (!verifyWebhookSignature(payload, signature, secretHash)) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    const { event, data } = req.body;
    console.log(`🔔 Processing webhook event: ${event}`);
    console.log(`🔔 Transaction data:`, data);
    
    if (event === 'charge.completed' && data.status === 'successful') {
      await handleSuccessfulPayment(data);
    } else if (event === 'charge.failed' || (event === 'charge.completed' && data.status === 'failed')) {
      await handleFailedPayment(data);
    }
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment
 */
const handleSuccessfulPayment = async (data) => {
  try {
    const { tx_ref, flw_ref, amount, customer } = data;
    console.log(`✅ Processing successful payment for tx_ref: ${tx_ref}`);
    
    // Find and update transaction based on tx_ref
    const transaction = await Transaction.findOne({ tx_ref });
    if (transaction) {
      console.log(`✅ Found transaction: ${transaction._id}`);
      
      // Update transaction status
      transaction.status = 'successful';
      transaction.flw_ref = flw_ref;
      transaction.updatedAt = new Date();
      await transaction.save();
      
      // Update user wallet balance if it's a wallet funding
      if (transaction.biller_code === 'WALLET_FUNDING') {
        await updateWalletBalance(transaction.userId, transaction.userAmount);
        console.log(`✅ Updated wallet balance for user: ${transaction.userId}`);
      }
      
      // Update subscription status if it's a subscription payment
      if (transaction.biller_code === 'SUBSCRIPTION') {
        await updateUserSubscription(transaction.userId, true);
        console.log(`✅ Updated subscription status for user: ${transaction.userId}`);
      }
      
      console.log(`✅ Transaction ${tx_ref} marked as successful`);
    } else {
      console.log(`⚠️ Transaction not found for tx_ref: ${tx_ref}`);
    }
    
  } catch (error) {
    console.error('❌ Error handling successful payment:', error);
  }
};

/**
 * Handle failed payment
 */
const handleFailedPayment = async (data) => {
  try {
    const { tx_ref, flw_ref } = data;
    console.log(`❌ Processing failed payment for tx_ref: ${tx_ref}`);
    
    // Find and update transaction
    const transaction = await Transaction.findOne({ tx_ref });
    if (transaction) {
      console.log(`❌ Found transaction: ${transaction._id}`);
      
      // Update transaction status
      transaction.status = 'failed';
      transaction.flw_ref = flw_ref;
      transaction.updatedAt = new Date();
      await transaction.save();
      
      console.log(`❌ Transaction ${tx_ref} marked as failed`);
    } else {
      console.log(`⚠️ Transaction not found for tx_ref: ${tx_ref}`);
    }
    
  } catch (error) {
    console.error('❌ Error handling failed payment:', error);
  }
};

/**
 * Update user wallet balance
 */
const updateWalletBalance = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.walletBalance += amount;
      await user.save();
      
      // Create wallet transaction record
      await WalletTransaction.create({
        userId,
        type: 'credit',
        amount,
        description: 'Wallet funding',
        status: 'completed',
        reference: `WALLET_FUND_${Date.now()}`,
      });
      
      console.log(`✅ Wallet balance updated: +₦${amount}`);
    }
  } catch (error) {
    console.error('❌ Error updating wallet balance:', error);
  }
};

/**
 * Update user subscription status
 */
const updateUserSubscription = async (userId, isActive) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.hasActiveSubscription = isActive;
      user.subscriptionExpiry = isActive ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null; // 30 days
      await user.save();
      
      console.log(`✅ Subscription status updated for user: ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error updating subscription status:', error);
  }
};

module.exports = {
  handleFlutterwaveWebhook
};