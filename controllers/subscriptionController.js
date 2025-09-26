const axios = require('axios');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { sendEmail } = require('../utils/emailService');

// Flutterwave configuration
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const SUBSCRIPTION_AMOUNT = parseFloat(process.env.SUBSCRIPTION_AMOUNT) || 4500;

/**
 * Initialize subscription payment with Flutterwave Standard checkout
 * POST /api/user/subscribe/initiate
 */
const initiateSubscription = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is already subscribed
    if (user.isSubscriber) {
      return res.status(400).json({
        success: false,
        message: 'User is already subscribed'
      });
    }

    // Generate unique transaction reference
    const txRef = `MARALEM_SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('💳 Initiating subscription payment:');
    console.log('   User:', user.email);
    console.log('   Amount: ₦' + SUBSCRIPTION_AMOUNT);
    console.log('   TX Ref:', txRef);

    // Prepare Flutterwave payment payload
    const paymentPayload = {
      tx_ref: txRef,
      amount: SUBSCRIPTION_AMOUNT,
      currency: 'NGN',
      customer: {
        email: user.email,
        phone_number: user.phoneNumber || '08000000000',
        name: user.fullName || user.email.split('@')[0],
      },
      payment_options: 'card,mobilemoney,ussd',
      redirect_url: `${process.env.FRONTEND_URL}/subscription/callback?tx_ref=${txRef}`,
      meta: {
        user_id: user._id.toString(),
        payment_type: 'subscription',
        subscription_amount: SUBSCRIPTION_AMOUNT,
      },
      customizations: {
        title: 'MaralemPay - Premium Subscription',
        description: `6 months Premium Plan - ₦${SUBSCRIPTION_AMOUNT}`,
        logo: 'https://maralempay.com.ng/logo.png',
      },
    };

    // Initialize payment with Flutterwave
    const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/payments`, paymentPayload, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status === 'success') {
      const data = response.data.data;
      
      // Create subscription record
      const subscription = new Subscription({
        user: user._id,
        txRef: txRef,
        amount: SUBSCRIPTION_AMOUNT,
        currency: 'NGN',
        status: 'pending',
        flutterwaveId: data.id,
        checkoutUrl: data.link,
        createdAt: new Date(),
      });
      
      await subscription.save();

      console.log('✅ Subscription payment initialized successfully');
      console.log('   Flutterwave ID:', data.id);
      console.log('   Checkout URL:', data.link);

      res.json({
        success: true,
        message: 'Subscription payment initialized successfully',
        data: {
          txRef: txRef,
          amount: SUBSCRIPTION_AMOUNT,
          currency: 'NGN',
          checkoutUrl: data.link,
          flutterwaveId: data.id,
        },
      });
    } else {
      console.log('❌ Failed to initialize subscription payment:', response.data.message);
      res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to initialize subscription payment',
        error: response.data.data,
      });
    }
  } catch (error) {
    console.error('❌ Error initiating subscription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

/**
 * Verify subscription payment and update user status
 * POST /api/user/subscribe/verify
 */
const verifySubscription = async (req, res) => {
  try {
    const { txRef } = req.body;
    const user = req.user;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying subscription payment:', txRef);

    // Find subscription record
    const subscription = await Subscription.findOne({ txRef, user: user._id });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription record not found'
      });
    }

    // Verify payment with Flutterwave
    const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/transactions/${txRef}/verify`, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
    });

    if (response.data.status === 'success') {
      const paymentData = response.data.data;
      
      // Check if payment is successful and amount matches
      if (paymentData.status === 'successful' && 
          paymentData.amount === SUBSCRIPTION_AMOUNT &&
          paymentData.currency === 'NGN') {
        
        // Calculate subscription expiry (6 months from now)
        const subscriptionExpiry = new Date();
        subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 6);

        // Update user subscription status
        await User.findByIdAndUpdate(user._id, {
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionDate: new Date(),
          subscriptionExpiry: subscriptionExpiry,
        });

        // Update subscription record
        subscription.status = 'completed';
        subscription.verifiedAt = new Date();
        subscription.paymentData = paymentData;
        await subscription.save();

        console.log('✅ Subscription verified and activated successfully');
        console.log('   User:', user.email);
        console.log('   Expiry:', subscriptionExpiry);

        // Send success email
        try {
          await sendEmail({
            to: user.email,
            subject: '🎉 Subscription Successful!',
            template: 'subscription_success',
            data: {
              userName: user.fullName || user.email.split('@')[0],
              amount: SUBSCRIPTION_AMOUNT,
              expiryDate: subscriptionExpiry.toLocaleDateString(),
              benefits: [
                '10% discount on all airtime and data purchases',
                'Purchase for family and friends',
                'Priority customer support',
                'Detailed transaction history'
              ]
            }
          });
          console.log('✅ Subscription success email sent to:', user.email);
        } catch (emailError) {
          console.error('❌ Failed to send subscription success email:', emailError);
        }

        res.json({
          success: true,
          message: 'Subscription verified and activated successfully',
          data: {
            isSubscriber: true,
            subscriptionStatus: 'active',
            subscriptionDate: new Date(),
            subscriptionExpiry: subscriptionExpiry,
            amount: SUBSCRIPTION_AMOUNT,
            txRef: txRef,
          },
        });
      } else {
        console.log('❌ Payment verification failed:', paymentData.status);
        res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          error: 'Payment status: ' + paymentData.status,
        });
      }
    } else {
      console.log('❌ Flutterwave verification failed:', response.data.message);
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: response.data.message,
      });
    }
  } catch (error) {
    console.error('❌ Error verifying subscription payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

/**
 * Get user subscription status
 * GET /api/user/subscription/status
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if subscription is still active
    const isActive = user.isSubscriber && 
                     user.subscriptionExpiry && 
                     new Date() < new Date(user.subscriptionExpiry);

    // If subscription has expired, update user status
    if (user.isSubscriber && !isActive) {
      await User.findByIdAndUpdate(user._id, {
        isSubscriber: false,
        subscriptionStatus: 'expired',
      });
    }

    res.json({
      success: true,
      data: {
        isSubscriber: isActive,
        subscriptionStatus: isActive ? 'active' : 'inactive',
        subscriptionDate: user.subscriptionDate,
        subscriptionExpiry: user.subscriptionExpiry,
        daysRemaining: isActive ? Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      },
    });
  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

/**
 * Cancel subscription (for future use)
 * POST /api/user/subscription/cancel
 */
const cancelSubscription = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.isSubscriber) {
      return res.status(400).json({
        success: false,
        message: 'User is not subscribed'
      });
    }

    // Update user subscription status
    await User.findByIdAndUpdate(user._id, {
      isSubscriber: false,
      subscriptionStatus: 'cancelled',
      subscriptionExpiry: new Date(), // Set expiry to now
    });

    console.log('✅ Subscription cancelled for user:', user.email);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        isSubscriber: false,
        subscriptionStatus: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

module.exports = {
  initiateSubscription,
  verifySubscription,
  getSubscriptionStatus,
  cancelSubscription,
};