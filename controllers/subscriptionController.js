const User = require('../models/User');
const { createFlutterwavePayment } = require('../utils/flutterwave');
const emailService = require('../utils/emailService');
const axios = require('axios');

/**
 * Initiate subscription payment
 * POST /api/subscription/initiate
 */
const initiateSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has active subscription
    if (user.isSubscriber && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    const subscriptionAmount = parseFloat(process.env.SUBSCRIPTION_AMOUNT) || 4500;
    
    // Generate unique transaction reference
    const txRef = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Flutterwave payment
    const paymentData = {
      tx_ref: txRef,
      amount: subscriptionAmount,
      currency: 'NGN',
      customer: {
        email: user.email,
        phone_number: user.phoneNumber || '08000000000',
        name: user.fullName || user.email.split('@')[0]
      },
      payment_options: 'card,mobilemoney,ussd',
      redirect_url: `${process.env.FRONTEND_URL}/subscription/callback`,
      meta: {
        user_id: userId.toString(),
        payment_type: 'subscription',
        subscription_amount: subscriptionAmount
      },
      customizations: {
        title: 'MaralemPay - Premium Subscription',
        description: `Premium subscription for ${user.fullName || user.email}`,
        logo: 'https://maralempay.com.ng/logo.png'
      }
    };

    console.log('💳 Initiating subscription payment:', {
      userId: userId.toString(),
      amount: subscriptionAmount,
      txRef: txRef,
      email: user.email
    });

    const flutterwaveResponse = await createFlutterwavePayment(paymentData);
    
    if (flutterwaveResponse.status === 'success') {
      // Store pending transaction in user document
      await User.findByIdAndUpdate(userId, {
        $set: {
          pendingSubscription: {
            txRef: txRef,
            amount: subscriptionAmount,
            status: 'pending',
            createdAt: new Date()
          }
        }
      });

      res.json({
        success: true,
        message: 'Subscription payment initiated successfully',
        data: {
          checkoutUrl: flutterwaveResponse.data.link,
          txRef: txRef,
          amount: subscriptionAmount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: flutterwaveResponse.message || 'Failed to initiate subscription payment'
      });
    }
  } catch (error) {
    console.error('❌ Error initiating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify subscription payment
 * POST /api/subscription/verify
 */
const verifySubscription = async (req, res) => {
  try {
    const { txRef } = req.body;
    const userId = req.user._id;
    
    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying subscription payment:', { txRef, userId });

    // Verify transaction with Flutterwave
    const verificationResponse = await verifyFlutterwaveTransaction(txRef);
    
    if (!verificationResponse.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResponse.message
      });
    }

    const transaction = verificationResponse.data;
    const subscriptionAmount = parseFloat(process.env.SUBSCRIPTION_AMOUNT) || 4500;

    // Verify amount matches expected subscription amount
    if (transaction.amount !== subscriptionAmount) {
      console.error('❌ Amount mismatch:', {
        expected: subscriptionAmount,
        received: transaction.amount
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Update user subscription status
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 6); // 6 months subscription

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isSubscriber: true,
          subscriptionStatus: 'active',
          subscriptionDate: new Date(),
          subscriptionExpiry: subscriptionExpiry,
          subscriptionAmount: subscriptionAmount
        },
        $unset: {
          pendingSubscription: 1
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Subscription activated for user:', {
      userId: userId.toString(),
      email: updatedUser.email,
      expiry: subscriptionExpiry
    });

    // Send success email
    try {
      await emailService.sendSubscriptionSuccessEmail({
        to: updatedUser.email,
        name: updatedUser.fullName || updatedUser.email.split('@')[0],
        amount: subscriptionAmount,
        expiryDate: subscriptionExpiry.toLocaleDateString(),
        transactionId: transaction.id
      });
    } catch (emailError) {
      console.error('❌ Error sending subscription success email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        user: updatedUser.getPublicProfile(),
        subscription: {
          isActive: true,
          expiryDate: subscriptionExpiry,
          amount: subscriptionAmount
        }
      }
    });
  } catch (error) {
    console.error('❌ Error verifying subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get subscription status
 * GET /api/subscription/status
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isActive = user.isSubscriber && 
                     user.subscriptionExpiry && 
                     new Date(user.subscriptionExpiry) > new Date();

    res.json({
      success: true,
      data: {
        isSubscriber: user.isSubscriber,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionDate: user.subscriptionDate,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionAmount: user.subscriptionAmount,
        isActive: isActive,
        daysRemaining: isActive ? Math.ceil((new Date(user.subscriptionExpiry) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      }
    });
  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify Flutterwave transaction
 */
const verifyFlutterwaveTransaction = async (txRef) => {
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Transaction verification failed'
      };
    }
  } catch (error) {
    console.error('❌ Flutterwave verification error:', error);
    return {
      success: false,
      message: 'Transaction verification failed',
      error: error.message
    };
  }
};

module.exports = {
  initiateSubscription,
  verifySubscription,
  getSubscriptionStatus,
  verifyFlutterwaveTransaction
};