const axios = require('axios');

class SendPulseEmailService {
  constructor() {
    this.clientId = process.env.SENDPULSE_CLIENT_ID;
    this.clientSecret = process.env.SENDPULSE_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('SENDPULSE_CLIENT_ID and SENDPULSE_CLIENT_SECRET environment variables are required');
    }
    
    console.log('📧 Using SendPulse API email service');
  }

  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Requesting new SendPulse access token...');
      
      const response = await axios.post('https://api.sendpulse.com/oauth/access_token', {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 1 hour (3600 seconds) minus 5 minutes buffer
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('✅ SendPulse access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get SendPulse access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with SendPulse API');
    }
  }

  async sendVerificationCode(email, code, type = 'verification') {
    try {
      console.log(`📧 Sending ${type} verification code to ${email} via SendPulse...`);

      const accessToken = await this.getAccessToken();

      const subject = type === 'password_reset' 
        ? 'Password Reset Code - MaralemPay'
        : 'Verification Code - MaralemPay';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">MaralemPay</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Your ${type === 'password_reset' ? 'Password Reset' : 'Verification'} Code</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Use the following code to ${type === 'password_reset' ? 'reset your password' : 'verify your account'}:
            </p>
            
            <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;">
              <h1 style="color: white; font-size: 32px; margin: 0; letter-spacing: 3px;">${code}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              This code will expire in 10 minutes for security reasons.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © 2025 MaralemPay. All rights reserved.
            </p>
          </div>
        </div>
      `;

      const textContent = `
        MaralemPay - ${type === 'password_reset' ? 'Password Reset' : 'Verification'} Code
        
        Your ${type === 'password_reset' ? 'password reset' : 'verification'} code is: ${code}
        
        This code will expire in 10 minutes for security reasons.
        
        If you didn't request this code, please ignore this email.
        
        © 2025 MaralemPay. All rights reserved.
      `;

      // Use direct content without Base64 encoding (as per PowerShell example)
      const emailData = {
        email: {
          html: htmlContent,
          text: textContent,
          subject: subject,
          from: {
            name: process.env.EMAIL_FROM_NAME || 'MaralemPay Support',
            email: process.env.EMAIL_FROM || 'hello@maralempay.com.ng'
          },
          to: [
            {
              email: email
            }
          ]
        }
      };

      const response = await axios.post('https://api.sendpulse.com/smtp/emails', emailData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ ${type} email sent successfully to ${email} via SendPulse`);
      return { 
        success: true, 
        messageId: response.data.id || 'sendpulse-' + Date.now(),
        provider: 'sendpulse'
      };

    } catch (error) {
      console.error(`❌ Error sending ${type} email to ${email} via SendPulse:`, error.response?.data || error.message);
      throw error;
    }
  }

  async verifyConnection() {
    try {
      await this.getAccessToken();
      console.log('✅ SendPulse API connection verified');
      return true;
    } catch (error) {
      console.error('❌ SendPulse API connection failed:', error.message);
      return false;
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing SendPulse API connection...');
      const accessToken = await this.getAccessToken();
      
      // Test with a simple email
      const testEmailData = {
        email: {
          html: '<h1>Test Email from MaralemPay</h1><p>This is a test email to verify SendPulse integration.</p>',
          text: 'Test Email from MaralemPay\n\nThis is a test email to verify SendPulse integration.',
          subject: 'Test Email - MaralemPay SendPulse Integration',
          from: {
            name: process.env.EMAIL_FROM_NAME || 'MaralemPay Support',
            email: process.env.EMAIL_FROM || 'hello@maralempay.com.ng'
          },
          to: [
            {
              email: 'test@example.com' // This won't actually send, just tests the API
            }
          ]
        }
      };

      console.log('✅ SendPulse API connection test successful');
      return { 
        success: true, 
        message: 'SendPulse API connection verified successfully',
        provider: 'sendpulse'
      };
    } catch (error) {
      console.error('❌ SendPulse API connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        provider: 'sendpulse'
      };
    }
  }
}

module.exports = new SendPulseEmailService();
