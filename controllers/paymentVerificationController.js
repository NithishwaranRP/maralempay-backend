const { FlutterwaveService } = require('../utils/flutterwave');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const flutterwaveService = new FlutterwaveService();

/**
 * Verify payment with Flutterwave and update subscription status
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
      current_subscription_status: user.isSubscriber,
      payment_email: customerEmail
    });
    
    // Step 4: Check if this is a subscription payment
    const paymentAmount = parseFloat(paymentData.amount);
    const subscriptionAmount = parseFloat(process.env.SUBSCRIPTION_AMOUNT || 750);
    
    if (Math.abs(paymentAmount - subscriptionAmount) < 1) { // Allow for minor differences
      console.log('💳 This is a subscription payment, activating subscription...');
      
      // --> 💡 LOG 1: Confirming update attempt <--
      console.log(`[SUBSCRIPTION FINALIZE] Verified success for User ID: ${user._id}. Attempting DB update.`);
      console.log(`[SUBSCRIPTION FINALIZE] Payment amount: ${paymentAmount}, Expected: ${subscriptionAmount}`);
      
      // Step 5: Activate subscription
      const subscriptionDuration = parseInt(process.env.SUBSCRIPTION_DURATION || 90); // 90 days
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + subscriptionDuration);
      
      try {
        // Update user subscription status
        const updatedUser = await User.findByIdAndUpdate(user._id, {
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionDate: new Date(),
          subscriptionExpiry: subscriptionExpiry
        }, { new: true });

        if (updatedUser) {
          // --> ✅ LOG 2: Success Confirmation <--
          console.log(`[SUBSCRIPTION FINALIZE] Success: User ${user._id} is now subscribed until ${updatedUser.subscriptionExpiry}`);
          console.log(`[SUBSCRIPTION FINALIZE] User subscription status: isSubscriber=${updatedUser.isSubscriber}, subscriptionStatus=${updatedUser.subscriptionStatus}`);
        } else {
          // --> ❌ LOG 3: User Not Found/Update Failed <--
          console.error(`[SUBSCRIPTION FINALIZE] ERROR: User ${user._id} not found or update failed after successful payment.`);
        }
      } catch (dbError) {
        // --> ❌ LOG 4: Database Error Capture <--
        console.error(`[SUBSCRIPTION FINALIZE] CRITICAL DB ERROR for user ${user._id}:`, dbError.message || dbError);
        console.error(`[SUBSCRIPTION FINALIZE] DB Error stack:`, dbError.stack);
        throw new Error('Database update failed post-verification.');
      }
      
      // Create or update subscription record
      console.log(`[SUBSCRIPTION FINALIZE] Creating/updating subscription record for user ${user._id}`);
      const existingSubscription = await Subscription.findOne({ user: user._id });
      
      if (existingSubscription) {
        // Extend existing subscription
        console.log(`[SUBSCRIPTION FINALIZE] Updating existing subscription ${existingSubscription._id}`);
        await Subscription.findByIdAndUpdate(existingSubscription._id, {
          status: 'active',
          paymentStatus: 'paid', // CRITICAL: Update payment status to 'paid'
          amount: paymentAmount,
          startDate: new Date(),
          endDate: subscriptionExpiry,
          paymentReference: verificationRef,
          flutterwaveRef: paymentData.flw_ref
        });
        console.log(`[SUBSCRIPTION FINALIZE] Subscription record updated successfully with paymentStatus: 'paid'`);
      } else {
        // Create new subscription
        console.log(`[SUBSCRIPTION FINALIZE] Creating new subscription record`);
        const newSubscription = await Subscription.create({
          user: user._id,
          status: 'active',
          paymentStatus: 'paid', // CRITICAL: Set payment status to 'paid'
          amount: paymentAmount,
          startDate: new Date(),
          endDate: subscriptionExpiry,
          paymentReference: verificationRef,
          flutterwaveRef: paymentData.flw_ref
        });
        console.log(`[SUBSCRIPTION FINALIZE] New subscription record created: ${newSubscription._id} with paymentStatus: 'paid'`);
      }
      
      console.log('✅ Subscription activated successfully:', {
        user_id: user._id,
        email: user.email,
        expires_at: subscriptionExpiry,
        amount: paymentAmount
      });
      
      // Return success response
      return res.json({
        success: true,
        message: 'Payment verified and subscription activated successfully',
        data: {
          user_id: user._id,
          email: user.email,
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionDate: new Date(),
          subscription_expiry: subscriptionExpiry,
          payment_amount: paymentAmount,
          payment_status: paymentData.status,
          verification_ref: verificationRef,
          flutterwave_ref: paymentData.flw_ref
        },
        verification_result: verificationResult
      });
    } else {
      console.log('💰 This is not a subscription payment, amount:', paymentAmount);
      
      // Handle other payment types (bills, wallet funding, etc.)
      return res.json({
        success: true,
        message: 'Payment verified successfully (non-subscription)',
        data: {
          user_id: user._id,
          email: user.email,
          payment_amount: paymentAmount,
          payment_status: paymentData.status,
          payment_type: 'non_subscription',
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
    
    // Check if user exists and subscription status
    const customerEmail = paymentData.customer?.email;
    let subscriptionInfo = null;
    
    if (customerEmail) {
      const user = await User.findOne({ email: customerEmail });
      if (user) {
        subscriptionInfo = {
          isSubscriber: user.isSubscriber,
          subscriptionStatus: user.subscriptionStatus,
          subscription_expiry: user.subscriptionExpiry,
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
        subscription_info: subscriptionInfo,
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
