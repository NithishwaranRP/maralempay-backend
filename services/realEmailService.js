const nodemailer = require('nodemailer');

class RealEmailService {
  constructor() {
    // Check if mock mode is explicitly enabled
    this.useMockMode = process.env.USE_MOCK_EMAIL === 'true';
    
    if (this.useMockMode) {
      console.log('📧 Using MOCK email service (USE_MOCK_EMAIL=true)');
      this.setupMockTransporter();
    } else {
      console.log('📧 Using REAL MaralemPay domain SMTP email service');
      this.setupDomainTransporter();
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

  setupDomainTransporter() {
    // Check if domain SMTP credentials are provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️  Domain SMTP credentials not found, falling back to mock mode');
      this.useMockMode = true;
      this.setupMockTransporter();
      return;
    }

    // MaralemPay domain SMTP configuration with multiple options
    const domainConfigs = [
      {
        name: 'MaralemPay SMTP (Port 465 - SSL)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: parseInt(process.env.EMAIL_PORT) || 465,
          secure: true, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
          pool: false,
          maxConnections: 1,
          maxMessages: 1
        }
      },
      {
        name: 'MaralemPay SMTP (Port 587 - STARTTLS)',
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
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
          pool: false,
          maxConnections: 1,
          maxMessages: 1
        }
      },
      {
        name: 'MaralemPay SMTP (Port 25 - Plain)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 25,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          connectionTimeout: 10000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
          pool: false,
          maxConnections: 1,
          maxMessages: 1
        }
      }
    ];

    // Try to find a working domain configuration
    this.tryDomainConfigs(domainConfigs);
  }

  async tryDomainConfigs(configs) {
    for (const config of configs) {
      try {
        console.log(`🔍 Trying ${config.name}...`);
        this.transporter = nodemailer.createTransport(config.config);
        
        // Test the connection
        await this.transporter.verify();
        console.log(`✅ SMTP connected successfully (${config.config.host})`);
        return;
      } catch (error) {
        console.log(`❌ ${config.name} failed: ${error.message}`);
        continue;
      }
    }
    
    // If all domain configs fail, try Gmail as fallback
    console.log('⚠️  All MaralemPay domain configurations failed, trying Gmail fallback...');
    this.tryGmailFallback();
  }

  async tryGmailFallback() {
    // Only try Gmail if Gmail credentials are explicitly provided
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        console.log('🔍 Trying Gmail SMTP fallback...');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });
        
        await this.transporter.verify();
        console.log('✅ Gmail SMTP fallback connected successfully');
        return;
      } catch (error) {
        console.log(`❌ Gmail fallback failed: ${error.message}`);
      }
    } else {
      console.log('⚠️  Gmail credentials not found (GMAIL_USER, GMAIL_PASS)');
    }
    
    // If all configurations fail, fall back to mock mode
    console.log('⚠️  All SMTP configurations failed, falling back to mock mode');
    console.log('💡 To fix MaralemPay domain SMTP:');
    console.log('   1. Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in .env');
    console.log('   2. Verify mail.maralempay.com.ng is accessible');
    console.log('   3. Check firewall and network settings');
    this.useMockMode = true;
    this.setupMockTransporter();
  }

  async verifyConnection() {
    if (this.useMockMode) {
      console.log('📧 Using mock email service');
      return;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      console.error('💡 Make sure you have:');
      console.error('   - EMAIL_HOST set to your mail server');
      console.error('   - EMAIL_PORT set to the correct port (465, 587, or 25)');
      console.error('   - EMAIL_USER set to your email address');
      console.error('   - EMAIL_PASS set to your email password');
      console.error('   - Mail server is accessible and credentials are correct');
    }
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send email verification code
  async sendVerificationCode(email, code, type = 'registration') {
    try {
      if (this.useMockMode) {
        return this.sendMockEmail(email, code, type);
      }

      console.log(`📧 Sending ${type} verification code to ${email}...`);
      
      const subject = type === 'registration' 
        ? 'MaralemPay - Email Verification Code'
        : 'MaralemPay - Password Reset Code';

      const htmlContent = this.getEmailTemplate(code, type);

      const fromName = process.env.EMAIL_FROM_NAME || 'MaralemPay';
      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const fromAddress = `${fromName} <${fromEmail}>`;

      const mailOptions = {
        from: fromAddress,
        to: email,
        subject: subject,
        html: htmlContent
      };

      // Send email with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 15 seconds')), 15000)
      );

      const emailPromise = this.transporter.sendMail(mailOptions);
      const result = await Promise.race([emailPromise, timeoutPromise]);

      if (result && result.messageId) {
        console.log(`✅ ${type} verification email sent successfully to ${email}`);
        console.log(`📧 Message ID: ${result.messageId}`);
        return { 
          success: true, 
          messageId: result.messageId,
          message: 'Email sent successfully'
        };
      } else {
        throw new Error('No message ID returned from email service');
      }

    } catch (error) {
      console.error(`❌ Error sending ${type} email to ${email}:`, error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Mock email sending for testing
  async sendMockEmail(email, code, type) {
    console.log(`📧 [MOCK] Sending ${type} verification code to ${email}: ${code}`);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log the verification code for testing purposes
    console.log(`✅ [MOCK] Verification code for ${email}: ${code}`);
    console.log(`📧 [MOCK] Email type: ${type}`);
    console.log(`⏰ [MOCK] Code expires in 10 minutes`);
    
    return { 
      success: true, 
      messageId: `mock-${Date.now()}`,
      message: 'Email sent successfully (mock mode)'
    };
  }

  // Test email connection
  async testConnection() {
    if (this.useMockMode) {
      console.log('🔍 Testing mock email service...');
      return { 
        success: true, 
        message: 'Mock email service is ready' 
      };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection test successful');
      return { 
        success: true, 
        message: 'Gmail SMTP is ready' 
      };
    } catch (error) {
      console.error('❌ Gmail SMTP connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Get email template
  getEmailTemplate(code, type) {
    const isRegistration = type === 'registration';
    const title = isRegistration ? 'Email Verification' : 'Password Reset';
    const message = isRegistration 
      ? 'Thank you for registering with MaralemPay! Please use the verification code below to complete your registration:'
      : 'You requested a password reset for your MaralemPay account. Please use the verification code below to reset your password:';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - MaralemPay</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #4A90E2;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                color: #555;
            }
            .verification-code {
                background-color: #f8f9fa;
                border: 2px dashed #4A90E2;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #4A90E2;
                letter-spacing: 5px;
                font-family: 'Courier New', monospace;
            }
            .note {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MaralemPay</div>
                <h1 class="title">${title}</h1>
            </div>
            
            <div class="message">
                ${message}
            </div>
            
            <div class="verification-code">
                <div style="margin-bottom: 10px; color: #666;">Your verification code is:</div>
                <div class="code">${code}</div>
            </div>
            
            <div class="note">
                <strong>Important:</strong> This code will expire in 10 minutes. If you didn't request this ${isRegistration ? 'verification' : 'password reset'}, please ignore this email.
            </div>
            
            <div class="footer">
                <p>This email was sent by MaralemPay</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>&copy; 2024 MaralemPay. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new RealEmailService();
