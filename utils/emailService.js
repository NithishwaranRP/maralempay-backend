const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
      port: process.env.EMAIL_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
        pass: process.env.EMAIL_PASS || 'EzinwokE1@'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send OTP email for verification
   */
  async sendOTPEmail(to, otp, purpose = 'verification') {
    try {
      const subject = `MaralemPay ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #1565C0); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MaralemPay</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Your ${purpose} code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Use the following code to ${purpose} your account:
            </p>
            <div style="background: white; border: 2px solid #1976D2; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1976D2; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in 10 minutes. Do not share this code with anyone.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: to,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
  } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send transaction receipt email
   */
  async sendTransactionReceipt(to, transaction) {
    try {
      const subject = `MaralemPay Transaction Receipt - ${transaction.type}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #1565C0); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MaralemPay</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Transaction Receipt</h2>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Transaction ID:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${transaction._id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Type:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${transaction.type}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Amount:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">₦${transaction.amount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: ${transaction.status === 'successful' ? 'green' : 'red'};">${transaction.status}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Date:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${new Date(transaction.createdAt).toLocaleString()}</td>
                </tr>
                ${transaction.description ? `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold;">Description:</td>
                  <td style="padding: 10px 0;">${transaction.description}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            <p style="color: #666; font-size: 14px;">
              Thank you for using MaralemPay. Keep this receipt for your records.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: to,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Transaction receipt email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending transaction receipt email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const subject = 'MaralemPay Password Reset';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #1565C0); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MaralemPay</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              You requested to reset your password. Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1976D2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #1976D2;">${resetUrl}</a>
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: to,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to, userName) {
    try {
      const subject = 'Welcome to MaralemPay!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #1565C0); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MaralemPay</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to MaralemPay, ${userName}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Thank you for joining MaralemPay! You can now enjoy:
            </p>
            <ul style="color: #666; font-size: 16px; line-height: 1.8;">
              <li>Easy airtime and data purchases</li>
              <li>10% discount on all transactions</li>
              <li>Referral rewards and bonuses</li>
              <li>Secure and fast transactions</li>
            </ul>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1976D2; margin-top: 0;">Get Started</h3>
              <p style="color: #666; margin-bottom: 20px;">Subscribe now to unlock all features and start saving!</p>
              <a href="${process.env.FRONTEND_URL}/subscription" style="background: #1976D2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Subscribe Now
              </a>
            </div>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: to,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      console.error('Email configuration error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
