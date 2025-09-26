const nodemailer = require('nodemailer');

class SimpleEmailService {
  constructor() {
    this.useMockMode = process.env.USE_MOCK_EMAIL === 'true';
    
    if (this.useMockMode) {
      console.log('📧 Using MOCK email service (USE_MOCK_EMAIL=true)');
      this.setupMockTransporter();
    } else {
      console.log('📧 Using SIMPLE email service with Gmail SMTP');
      this.setupGmailTransporter();
    }
  }

  setupMockTransporter() {
    // Mock transporter for testing
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  setupGmailTransporter() {
    // Use Gmail SMTP as primary
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      console.log('🔍 Setting up Gmail SMTP...');
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.log('❌ Gmail SMTP connection failed:', error.message);
          console.log('⚠️  Falling back to mock mode');
          this.useMockMode = true;
          this.setupMockTransporter();
        } else {
          console.log('✅ Gmail SMTP connected successfully');
        }
      });
    } else {
      console.log('⚠️  Gmail credentials not found, using mock mode');
      console.log('💡 Set GMAIL_USER and GMAIL_PASS environment variables');
      this.useMockMode = true;
      this.setupMockTransporter();
    }
  }

  async sendVerificationCode(email, code, type = 'verification') {
    try {
      if (this.useMockMode) {
        console.log(`[MOCK] Sending ${type} verification code to ${email}: ${code}`);
        return { success: true, message: 'Mock email sent successfully' };
      }

      const subject = type === 'password_reset' 
        ? 'Password Reset Code - MaralemPay'
        : 'Verification Code - MaralemPay';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">MaralemPay</h2>
          <p>Your ${type === 'password_reset' ? 'password reset' : 'verification'} code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">MaralemPay Team</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.GMAIL_USER || 'noreply@maralempay.com',
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ ${type} email sent successfully to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Error sending ${type} email to ${email}:`, error.message);
      throw error;
    }
  }

  async verifyConnection() {
    if (this.useMockMode) {
      console.log('📧 Mock email service - no connection verification needed');
      return true;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new SimpleEmailService();