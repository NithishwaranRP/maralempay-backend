const User = require('../models/User');

/**
 * Check subscription status for web access
 */
const checkSubscriptionStatus = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasActiveSubscription = user.isSubscribed && 
      user.subscriptionExpiry && 
      user.subscriptionExpiry > new Date();

    const isEmailVerified = user.isEmailVerified || false;

    console.log('Checking subscription status for:', email, {
      isSubscribed: user.isSubscribed,
      subscriptionExpiry: user.subscriptionExpiry,
      hasActiveSubscription,
      isEmailVerified,
      canAccessApp: hasActiveSubscription && isEmailVerified
    });

    res.json({
      success: true,
      data: {
        hasActiveSubscription,
        isEmailVerified,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionDate: user.subscriptionDate,
        canAccessApp: hasActiveSubscription && isEmailVerified,
        userDetails: {
          isSubscribed: user.isSubscribed,
          isActive: user.isActive,
          subscriptionExpiry: user.subscriptionExpiry
        }
      }
    });
  } catch (error) {
    console.error('Check subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  checkSubscriptionStatus
};
