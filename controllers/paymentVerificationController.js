const { FlutterwaveService } = require('../utils/flutterwave');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
// Removed Subscription model - now using wallet-based discount system

const flutterwaveService = new FlutterwaveService();

/**
 * Verify payment with Flutterwave (subscription system removed - using wallet-based discounts)
 * POST /api/payment/verify
 * Body: { tx_ref, transaction_id }
 */
const verifyPayment = async (req, res) => {
  try {
    const { tx_ref, transaction_id } = req.body;
    const user = req.user; // Get authenticated user
    
    console.log('🔍 Payment verification request received:', {
      tx_ref,
      transaction_id,
      user_email: user?.email,
      user_id: user?._id,
      timestamp: new Date().toISOString()
    });
    
    // Validate input
    if (!tx_ref && !transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Either tx_ref or transaction_id is required for verification'
      });
    }
    
    // Use tx_ref as primary identifier, fallback to transaction_id
    const verificationRef = tx_ref || transaction_id;
    
    console.log('🔍 Verifying payment with Flutterwave:', {
      verification_ref: verificationRef,
      type: tx_ref ? 'tx_ref' : 'transaction_id'
    });
    
    // Step 1: Verify payment with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(verificationRef);
    
    if (!verificationResult.success) {
      console.log('❌ Flutterwave verification failed:', verificationResult.message);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: ' + verificationResult.message,
        verification_result: verificationResult
      });
    }
    
    const paymentData = verificationResult.data;
    console.log('✅ Flutterwave verification successful:', {
      status: paymentData.status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      customer_email: paymentData.customer?.email,
      flw_ref: paymentData.flw_ref
    });
    
    // Step 2: Check if payment is successful
    if (paymentData.status !== 'successful') {
      console.log('⚠️ Payment not successful:', paymentData.status);
      return res.status(400).json({
        success: false,
        message: `Payment status is ${paymentData.status}, not successful`,
        payment_status: paymentData.status,
        verification_result: verificationResult
      });
    }
    
    // Step 3: Use authenticated user (more reliable than email matching)
    if (!user) {
      console.log('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required for payment verification'
      });
    }
    
    // Verify the payment email matches the authenticated user (optional security check)
    const customerEmail = paymentData.customer?.email;
    if (customerEmail && customerEmail.toLowerCase() !== user.email.toLowerCase()) {
      console.log('⚠️ Payment email mismatch:', {
        payment_email: customerEmail,
        user_email: user.email
      });
      // Don't fail here - just log for debugging
    }
    
    console.log('👤 Authenticated user for payment verification:', {
      user_id: user._id,
      email: user.email,
      current_wallet_balance: user.walletBalance,
      payment_email: customerEmail
    });
    
    // Step 4: Check if this is a wallet funding payment
    const paymentAmount = parseFloat(paymentData.amount);
    
    // Check if this is a wallet funding transaction
    const transaction = await Transaction.findOne({ tx_ref });
    if (transaction && transaction.biller_code === 'WALLET_FUNDING') {
      console.log('💰 This is a wallet funding payment, updating wallet balance...');
      
      try {
        // Update user wallet balance
        const updatedUser = await User.findByIdAndUpdate(user._id, {
          $inc: { walletBalance: paymentAmount }
        }, { new: true });

        if (updatedUser) {
          console.log(`✅ Wallet funding successful: User ${user._id} wallet balance updated to ₦${updatedUser.walletBalance}`);
          
          // Update transaction status
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'completed',
            flw_ref: paymentData.flw_ref,
            updatedAt: new Date()
          });
          
          console.log('✅ Wallet funding completed successfully:', {
            user_id: user._id,
            email: user.email,
            amount_added: paymentAmount,
            new_balance: updatedUser.walletBalance
          });
          
          // Return success response
          return res.json({
            success: true,
            message: 'Payment verified and wallet funded successfully',
            data: {
              user_id: user._id,
              email: user.email,
              amount_added: paymentAmount,
              new_wallet_balance: updatedUser.walletBalance,
              payment_amount: paymentAmount,
              payment_status: paymentData.status,
              verification_ref: verificationRef,
              flutterwave_ref: paymentData.flw_ref
            },
            verification_result: verificationResult
          });
        } else {
          console.error(`❌ Failed to update wallet balance for user: ${user._id}`);
          return res.status(500).json({
            success: false,
            message: 'Failed to update wallet balance'
          });
        }
      } catch (walletError) {
        console.error('❌ Error updating wallet balance:', walletError);
        return res.status(500).json({
          success: false,
          message: 'Failed to update wallet balance',
          error: walletError.message
        });
      }
    } else {
      console.log('💰 This is not a wallet funding payment, amount:', paymentAmount);
      
      // Handle other payment types (bills, etc.)
      return res.json({
        success: true,
        message: 'Payment verified successfully (non-wallet funding)',
        data: {
          user_id: user._id,
          email: user.email,
          payment_amount: paymentAmount,
          payment_status: paymentData.status,
          payment_type: 'other',
          verification_ref: verificationRef,
          flutterwave_ref: paymentData.flw_ref
        },
        verification_result: verificationResult
      });
    }
    
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed due to server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get payment status for a transaction
 * GET /api/payment/status/:tx_ref
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const user = req.user; // Get authenticated user
    
    console.log('🔍 Payment status check for:', {
      tx_ref,
      user_email: user?.email,
      user_id: user?._id
    });
    
    // Verify with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(tx_ref);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get payment status: ' + verificationResult.message
      });
    }
    
    const paymentData = verificationResult.data;
    
    // Check if user exists and wallet balance
    const customerEmail = paymentData.customer?.email;
    let userInfo = null;
    
    if (customerEmail) {
      const user = await User.findOne({ email: customerEmail });
      if (user) {
        userInfo = {
          wallet_balance: user.walletBalance,
          qualifies_for_discount: user.walletBalance >= 1000,
          user_id: user._id
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        tx_ref: tx_ref,
        payment_status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_email: customerEmail,
        flutterwave_ref: paymentData.flw_ref,
        user_info: userInfo,
        payment_details: paymentData
      }
    });
    
  } catch (error) {
    console.error('❌ Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  verifyPayment,
  getPaymentStatus
};
