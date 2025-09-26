const nodemailer = require('nodemailer');

class SimpleEmailService {
  constructor() {
    console.log('📧 Using MaralemPay domain SMTP email service (REAL MODE ONLY)');
    this.setupDomainSMTP();
  }


  setupDomainSMTP() {
    // Use MaralemPay domain SMTP only - NO MOCK MODE
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required');
    }
    
    console.log('🔍 Setting up MaralemPay domain SMTP...');
    
    // Try multiple SMTP configurations for Render compatibility
    const smtpConfigs = [
      {
        name: 'Port 587 with STARTTLS',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000
        }
      },
      {
        name: 'Port 465 with SSL',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000
        }
      },
      {
        name: 'Port 25 Plain',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 25,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000
        }
      }
    ];
    
    this.trySMTPConfigs(smtpConfigs);
  }
  
  async trySMTPConfigs(configs) {
    for (const config of configs) {
      try {
        console.log(`🔍 Trying ${config.name}...`);
        this.transporter = nodemailer.createTransport(config.config);
        
        // Verify connection with longer timeout
        await this.transporter.verify();
        console.log(`✅ MaralemPay domain SMTP connected successfully (${config.name})`);
        return;
      } catch (error) {
        console.log(`❌ ${config.name} failed: ${error.message}`);
        continue;
      }
    }
    
    // If all configs fail, throw error (no mock mode)
    throw new Error('All MaralemPay domain SMTP configurations failed. Check network connectivity and SMTP settings.');
  }

  async sendVerificationCode(email, code, type = 'verification') {
    try {
      console.log(`📧 Sending ${type} verification code to ${email}...`);

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
      throw error;
    }
  }

  async verifyConnection() {
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