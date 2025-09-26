const axios = require('axios');

class EmailService {
  constructor() {
    this.sendpulseApiUrl = 'https://api.sendpulse.com';
    this.clientId = process.env.SENDPULSE_CLIENT_ID;
    this.clientSecret = process.env.SENDPULSE_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get SendPulse access token
   */
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.sendpulseApiUrl}/oauth/access_token`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error('❌ Error getting SendPulse access token:', error);
      throw new Error('Failed to authenticate with SendPulse');
    }
  }

  /**
   * Send email using SendPulse API
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      const accessToken = await this.getAccessToken();
      
      const emailData = {
        email: {
          html: html,
          text: text || this.stripHtml(html),
          subject: subject,
          from: {
            name: 'MaralemPay',
            email: 'noreply@maralempay.com.ng'
          },
          to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }]
        }
      };

      const response = await axios.post(
        `${this.sendpulseApiUrl}/smtp/emails`,
        emailData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Email sent successfully via SendPulse:', {
        to: to,
        subject: subject,
        messageId: response.data.id
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error sending email via SendPulse:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      throw error;
    }
  }

  /**
   * Send subscription success email
   */
  async sendSubscriptionSuccessEmail({ to, name, amount, expiryDate, transactionId }) {
    try {
      const subject = '🎉 Subscription Successful - Welcome to MaralemPay Premium!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Welcome to Premium!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Congratulations! Your MaralemPay Premium subscription has been activated successfully.
            </p>
            
            <div style="background: white; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Subscription Details</h3>
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
              <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
            </div>

            <div style="background: #e8f5e8; border: 1px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin-top: 0;">🎁 Premium Benefits Unlocked</h3>
              <ul style="color: #2e7d32; margin: 0; padding-left: 20px;">
                <li>10% discount on all Airtime purchases</li>
                <li>10% discount on all Data bundle purchases</li>
                <li>Priority customer support</li>
                <li>Exclusive features and updates</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              You can now enjoy discounted rates on all your airtime and data purchases. 
              Thank you for choosing MaralemPay!
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('❌ Error sending subscription success email:', error);
      throw error;
    }
  }

  /**
   * Send bill purchase success email
   */
  async sendBillPurchaseSuccessEmail({ to, name, productName, customerId, amount, discountAmount, transactionId }) {
    try {
      const subject = '✅ Purchase Successful - Your Airtime/Data is Ready!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4CAF50, #45a049); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Purchase Complete!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Your ${productName} purchase has been completed successfully and credited to ${customerId}.
            </p>
            
            <div style="background: white; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Purchase Details</h3>
              <p style="margin: 5px 0;"><strong>Product:</strong> ${productName}</p>
              <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${customerId}</p>
              <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Discount Saved:</strong> ₦${discountAmount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
            </div>

            <div style="background: #e8f5e8; border: 1px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin-top: 0;">💰 Premium Discount Applied</h3>
              <p style="color: #2e7d32; margin: 0;">
                Thanks to your Premium subscription, you saved ₦${discountAmount.toLocaleString()} on this purchase!
              </p>
            </div>

            <p style="color: #666; font-size: 14px;">
              Your purchase has been processed and the airtime/data has been credited to the specified number. 
              Thank you for using MaralemPay!
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('❌ Error sending bill purchase success email:', error);
      throw error;
    }
  }

  /**
   * Send bill purchase failure email
   */
  async sendBillPurchaseFailureEmail({ to, name, productName, customerId, amount, transactionId, error }) {
    try {
      const subject = '❌ Purchase Issue - We\'re Here to Help';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f44336, #d32f2f); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">❌ Purchase Issue</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              We encountered an issue while processing your ${productName} purchase for ${customerId}.
            </p>
            
            <div style="background: white; border-left: 4px solid #f44336; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Purchase Details</h3>
              <p style="margin: 5px 0;"><strong>Product:</strong> ${productName}</p>
              <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${customerId}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Failed</p>
            </div>

            <div style="background: #ffebee; border: 1px solid #f44336; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #c62828; margin-top: 0;">🔧 What Happens Next?</h3>
              <ul style="color: #c62828; margin: 0; padding-left: 20px;">
                <li>Your payment will be automatically refunded within 24-48 hours</li>
                <li>You can retry the purchase at any time</li>
                <li>Contact our support team if you need assistance</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              We apologize for any inconvenience. Our team is working to resolve this issue. 
              If you have any questions, please contact our support team.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('❌ Error sending bill purchase failure email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, resetToken, name) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const subject = 'Reset Your MaralemPay Password';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976D2, #1565C0); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">MaralemPay</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Hello ${name},<br><br>
              We received a request to reset your password. Click the button below to reset your password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1976D2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #1976D2;">${resetUrl}</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            © 2025 MaralemPay. All rights reserved.
          </div>
        </div>
      `;

      return await this.sendEmail(to, subject, html);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();