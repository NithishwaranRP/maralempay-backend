const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Manual subscription activation endpoint (for testing/admin purposes)
// POST /api/admin/activate-subscription
router.post('/activate-subscription', async (req, res) => {
  try {
    const { email, duration = 90 } = req.body;
    
    console.log('🔧 Manual subscription activation request:', {
      email,
      duration,
      timestamp: new Date().toISOString()
    });
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('👤 User found:', {
      user_id: user._id,
      email: user.email,
      current_subscription_status: user.isSubscribed
    });
    
    // Calculate subscription expiry
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + parseInt(duration));
    
    // Update user subscription status
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscriptionExpiry: subscriptionExpiry,
      subscriptionActivatedAt: new Date()
    });
    
    console.log('🎉 Subscription activated manually!');
    console.log('   User ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Expires:', subscriptionExpiry);
    console.log('   Duration:', duration, 'days');
    
    // Get updated user
    const updatedUser = await User.findById(user._id);
    
    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        user_id: user._id,
        email: user.email,
        isSubscribed: updatedUser.isSubscribed,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
        subscriptionActivatedAt: updatedUser.subscriptionActivatedAt,
        duration: duration
      }
    });
    
  } catch (error) {
    console.error('❌ Manual subscription activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Check user subscription status
// GET /api/admin/subscription-status/:email
router.get('/subscription-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user_id: user._id,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionActivatedAt: user.subscriptionActivatedAt,
        hasActiveSubscription: user.subscriptionExpiry ? new Date() < new Date(user.subscriptionExpiry) : false
      }
    });
    
  } catch (error) {
    console.error('❌ Subscription status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
