const resendEmailService = require('../services/resendEmailService');
const VerificationCode = require('../models/VerificationCode');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class EmailControllerOptimized {
  // Send verification code for registration (optimized for Vercel)
  async sendRegistrationCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Check if user already exists and is verified
      const existingUser = await User.findOne({ email, isEmailVerified: true });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Create verification code
      const verificationCode = await VerificationCode.createCode(email, 'registration');
      
      // Send email via Resend (fast and reliable)
      const emailResult = await resendEmailService.sendVerificationCode(email, verificationCode.code, 'registration');
      
      if (emailResult.success) {
        console.log('✅ Registration email sent successfully:', emailResult.messageId);
        res.status(200).json({
          success: true,
          message: 'Verification code sent successfully. Please check your email.',
          data: {
            email: email,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'sent',
            messageId: emailResult.messageId
          }
        });
      } else {
        console.error('❌ Registration email failed:', emailResult.error);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error('Error creating registration code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Send verification code for password reset (optimized for Vercel)
  async sendPasswordResetCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User with this email does not exist'
        });
      }

      // Create verification code
      const verificationCode = await VerificationCode.createCode(email, 'password_reset');
      
      // Send email via Resend (fast and reliable)
      const emailResult = await resendEmailService.sendVerificationCode(email, verificationCode.code, 'password_reset');
      
      if (emailResult.success) {
        console.log('✅ Password reset email sent successfully:', emailResult.messageId);
        res.status(200).json({
          success: true,
          message: 'Password reset code sent successfully. Please check your email.',
          data: {
            email: email,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'sent',
            messageId: emailResult.messageId
          }
        });
      } else {
        console.error('❌ Password reset email failed:', emailResult.error);
        res.status(500).json({
          success: false,
          message: 'Failed to send password reset email. Please try again later.',
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error('Error creating password reset code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Resend verification code (optimized for Vercel)
  async resendCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, type } = req.body;

      // Validate type
      if (!['registration', 'password_reset'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification type'
        });
      }

      // Check if user exists for password reset
      if (type === 'password_reset') {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User with this email does not exist'
          });
        }
      }

      // Check if user already exists for registration
      if (type === 'registration') {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'User with this email already exists'
          });
        }
      }

      // Create new verification code
      const verificationCode = await VerificationCode.createCode(email, type);
      
      // Send email via Resend (fast and reliable)
      const emailResult = await resendEmailService.sendVerificationCode(email, verificationCode.code, type);
      
      if (emailResult.success) {
        console.log('✅ Resend email sent successfully:', emailResult.messageId);
        res.status(200).json({
          success: true,
          message: 'Verification code sent successfully. Please check your email.',
          data: {
            email: email,
            type: type,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'sent',
            messageId: emailResult.messageId
          }
        });
      } else {
        console.error('❌ Resend email failed:', emailResult.error);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
          error: emailResult.error
        });
      }

    } catch (error) {
      console.error('Error resending verification code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Test email service
  async testEmailService(req, res) {
    try {
      const testResult = await resendEmailService.testConnection();
      
      if (testResult.success) {
        res.status(200).json({
          success: true,
          message: 'Resend email service is working correctly',
          data: {
            service: 'Resend',
            status: 'connected',
            fromEmail: process.env.RESEND_FROM_EMAIL || 'MaralemPay <noreply@maralempay.com.ng>',
            hasApiKey: !!process.env.RESEND_API_KEY
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Resend email service test failed',
          error: testResult.error,
          data: {
            service: 'Resend',
            status: 'failed',
            hasApiKey: !!process.env.RESEND_API_KEY
          }
        });
      }
    } catch (error) {
      console.error('Error testing email service:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Test Resend configuration
  async testResendConfiguration(req, res) {
    try {
      console.log('🔍 Testing Resend configuration...');
      
      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'RESEND_API_KEY not configured',
          data: {
            service: 'Resend',
            status: 'not_configured',
            hasApiKey: false
          }
        });
      }
      
      const testResult = await resendEmailService.testConnection();
      
      res.status(200).json({
        success: true,
        message: 'Resend configuration test completed',
        data: {
          service: 'Resend',
          status: testResult.success ? 'working' : 'failed',
          hasApiKey: true,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'MaralemPay <noreply@maralempay.com.ng>',
          testResult: testResult
        }
      });
    } catch (error) {
      console.error('Error testing Resend configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new EmailControllerOptimized();
