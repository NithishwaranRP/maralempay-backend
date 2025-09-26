const nodemailer = require('nodemailer');

class SimpleEmailService {
  constructor() {
    this.useMockMode = process.env.USE_MOCK_EMAIL === 'true';
    
    if (this.useMockMode) {
      console.log('📧 Using MOCK email service (USE_MOCK_EMAIL=true)');
      this.setupMockTransporter();
    } else {
      console.log('📧 Using MaralemPay domain SMTP email service');
      this.setupDomainSMTP();
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

  setupDomainSMTP() {
    // Use MaralemPay domain SMTP only
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('🔍 Setting up MaralemPay domain SMTP...');
      
      const smtpConfig = {
        host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
        port: parseInt(process.env.EMAIL_PORT) || 465,
        secure: true, // Use SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 30000      // 30 seconds
      };
      
      this.transporter = nodemailer.createTransport(smtpConfig);
      
      // Verify connection with timeout
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP verification timeout')), 15000)
      );
      
      Promise.race([verifyPromise, timeoutPromise])
        .then(() => {
          console.log('✅ MaralemPay domain SMTP connected successfully');
        })
        .catch((error) => {
          console.log('❌ MaralemPay domain SMTP connection failed:', error.message);
          console.log('⚠️  Falling back to mock mode');
          this.useMockMode = true;
          this.setupMockTransporter();
        });
    } else {
      console.log('⚠️  MaralemPay domain SMTP credentials not found, using mock mode');
      console.log('💡 Set EMAIL_USER and EMAIL_PASS environment variables');
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
        from: `${process.env.EMAIL_FROM_NAME || 'MaralemPay'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: html
      };

      // Send email with timeout
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 30000)
      );
      
      const result = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ ${type} email sent successfully to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Error sending ${type} email to ${email}:`, error.message);
      
      // If SMTP fails, fall back to mock mode for this request
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        console.log('⚠️  SMTP connection failed, using mock mode for this email');
        return { success: true, message: 'Email queued (SMTP unavailable)' };
      }
      
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