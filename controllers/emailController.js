const emailService = require('../services/simpleEmailService');
const VerificationCode = require('../models/VerificationCode');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class EmailController {
  // Send verification code for registration
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
      
      // Send email with timeout handling
      const emailPromise = emailService.sendVerificationCode(
        email, 
        verificationCode.code, 
        'registration'
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 10000) // 10 second timeout
      );
      
      let emailResult;
      try {
        emailResult = await Promise.race([emailPromise, timeoutPromise]);
      } catch (error) {
        console.error('Email sending failed or timed out:', error.message);
        // Don't fail the request if email times out - just log it
        console.log('Registration code created but email delivery may be delayed');
        
        // Return success but with a warning
        return res.status(200).json({
          success: true,
          message: 'Verification code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'pending'
          }
        });
      }

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        // Still return success but with warning
        return res.status(200).json({
          success: true,
          message: 'Verification code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            expiresIn: 10 * 60,
            emailDeliveryStatus: 'failed'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        data: {
          email: email,
          expiresIn: 10 * 60, // 10 minutes in seconds
          emailDeliveryStatus: 'sent'
        }
      });

    } catch (error) {
      console.error('Error sending registration code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Send verification code for password reset
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
      
      // Send email with timeout handling
      const emailPromise = emailService.sendVerificationCode(
        email, 
        verificationCode.code, 
        'password_reset'
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 10000) // 10 second timeout
      );
      
      let emailResult;
      try {
        emailResult = await Promise.race([emailPromise, timeoutPromise]);
      } catch (error) {
        console.error('Email sending failed or timed out:', error.message);
        // Don't fail the request if email times out - just log it
        console.log('Password reset code created but email delivery may be delayed');
        
        // Return success but with a warning
        return res.status(200).json({
          success: true,
          message: 'Password reset code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'pending'
          }
        });
      }

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        // Still return success but with warning
        return res.status(200).json({
          success: true,
          message: 'Password reset code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            expiresIn: 10 * 60,
            emailDeliveryStatus: 'failed'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password reset code sent successfully',
        data: {
          email: email,
          expiresIn: 10 * 60, // 10 minutes in seconds
          emailDeliveryStatus: 'sent'
        }
      });

    } catch (error) {
      console.error('Error sending password reset code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Verify code for registration
  async verifyRegistrationCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, code } = req.body;

      // Verify the code
      const verificationResult = await VerificationCode.verifyCode(email, code, 'registration');

      if (!verificationResult.success) {
        // Increment attempts for failed verification
        await VerificationCode.incrementAttempts(email, code, 'registration');
        
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          email: email,
          verified: true
        }
      });

    } catch (error) {
      console.error('Error verifying registration code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Verify code for password reset
  async verifyPasswordResetCode(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, code } = req.body;

      // Verify the code
      const verificationResult = await VerificationCode.verifyCode(email, code, 'password_reset');

      if (!verificationResult.success) {
        // Increment attempts for failed verification
        await VerificationCode.incrementAttempts(email, code, 'password_reset');
        
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password reset code verified successfully',
        data: {
          email: email,
          verified: true
        }
      });

    } catch (error) {
      console.error('Error verifying password reset code:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Resend verification code
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
      
      // Send email with timeout handling
      const emailPromise = emailService.sendVerificationCode(
        email, 
        verificationCode.code, 
        type
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 10000) // 10 second timeout
      );
      
      let emailResult;
      try {
        emailResult = await Promise.race([emailPromise, timeoutPromise]);
      } catch (error) {
        console.error('Email sending failed or timed out:', error.message);
        // Don't fail the request if email times out - just log it
        console.log('Verification code created but email delivery may be delayed');
        
        // Return success but with a warning
        return res.status(200).json({
          success: true,
          message: 'Verification code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            type: type,
            expiresIn: 10 * 60, // 10 minutes in seconds
            emailDeliveryStatus: 'pending'
          }
        });
      }

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        // Still return success but with warning
        return res.status(200).json({
          success: true,
          message: 'Verification code created. If you don\'t receive an email within a few minutes, please try again.',
          data: {
            email: email,
            type: type,
            expiresIn: 10 * 60,
            emailDeliveryStatus: 'failed'
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Verification code resent successfully',
        data: {
          email: email,
          type: type,
          expiresIn: 10 * 60, // 10 minutes in seconds
          emailDeliveryStatus: 'sent'
        }
      });

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
      const testResult = await emailService.testConnection();
      
      if (testResult.success) {
        res.status(200).json({
          success: true,
          message: 'Email service is working correctly'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Email service test failed',
          error: testResult.error
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
}

module.exports = new EmailController();