const VerificationCode = require('../models/VerificationCode');
const User = require('../models/User');

class DebugController {
  // Get all verification codes
  async getVerificationCodes(req, res) {
    try {
      const codes = await VerificationCode.find({}).sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: codes
      });
    } catch (error) {
      console.error('Error fetching verification codes:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get verification codes for specific email
  async getVerificationCodesByEmail(req, res) {
    try {
      const { email } = req.params;
      const codes = await VerificationCode.find({ email }).sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        data: codes
      });
    } catch (error) {
      console.error('Error fetching verification codes by email:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get user by email
  async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      console.error('Error fetching user by email:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Clean up expired verification codes
  async cleanupExpiredCodes(req, res) {
    try {
      const result = await VerificationCode.cleanupExpired();
      
      res.status(200).json({
        success: true,
        message: `Cleaned up ${result} expired verification codes`
      });
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Debug user status
  async debugUserStatus(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          isSubscribed: user.isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Error debugging user status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Manual activate subscription
  async manualActivateSubscription(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Activate subscription
      user.isSubscribed = true;
      user.subscriptionDate = new Date();
      user.subscriptionExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Subscription activated manually',
        data: {
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry
        }
      });
    } catch (error) {
      console.error('Error manually activating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new DebugController();