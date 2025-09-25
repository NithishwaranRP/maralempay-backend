const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email queue for async processing
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(emailData) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        ...emailData,
        resolve,
        reject,
        timestamp: Date.now()
      });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailJob = this.queue.shift();
      try {
        const result = await this.sendEmail(emailJob);
        emailJob.resolve(result);
      } catch (error) {
        emailJob.reject(error);
      }
    }
    
    this.processing = false;
  }

  async sendEmail(emailJob) {
    const { email, code, type, transporter } = emailJob;
    
    const subject = type === 'registration' 
      ? 'MaralemPay - Email Verification Code'
      : 'MaralemPay - Password Reset Code';

    const htmlContent = this.getEmailTemplate(code, type);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
      to: email,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  }

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

class EmailService {
  constructor() {
    // Initialize email queue
    this.emailQueue = new EmailQueue();
    
    console.log('📧 Using MaralemPay SMTP as primary email service');
    
    // MaralemPay SMTP configuration with working settings
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
      port: parseInt(process.env.EMAIL_PORT) || 465, // Use 465 (SSL)
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
        pass: process.env.EMAIL_PASS || 'EzinwokE1@'
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
        ciphers: 'SSLv3'
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 15000, // 15 seconds
      socketTimeout: 30000, // 30 seconds
      pool: false, // Disable pooling for better reliability
      maxConnections: 1, // Single connection
      maxMessages: 1, // One message per connection
      rateDelta: 20000, // Rate limiting
      rateLimit: 1 // Maximum 1 email per rateDelta
    });

    // Alternative configurations for different ports
    this.alternativeConfigs = [
      {
        name: 'Port 465 (SSL)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      },
      {
        name: 'Port 587 (STARTTLS)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      },
      {
        name: 'Port 25 (Plain)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 25,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      }
    ];

    // No fallback - only MaralemPay SMTP
    this.fallbackTransporter = null;
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send email synchronously with proper error handling and timeout
  async sendVerificationCodeAsync(email, code, type = 'registration') {
    try {
      console.log('📧 Attempting to send email via MaralemPay SMTP...');
      
      // Try primary configuration first with timeout
      try {
        const result = await this.sendEmailWithTimeout(email, code, type, this.transporter, 'Primary MaralemPay SMTP');
        console.log('✅ Verification email sent successfully via primary MaralemPay SMTP:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (primaryError) {
        console.error('❌ Primary MaralemPay SMTP failed:', primaryError.message);
        
        // Try alternative configurations
        for (const altConfig of this.alternativeConfigs) {
          try {
            console.log(`🔄 Trying ${altConfig.name}...`);
            const altTransporter = nodemailer.createTransport(altConfig.config);
            
            const result = await this.sendEmailWithTimeout(email, code, type, altTransporter, altConfig.name);
            console.log(`✅ Verification email sent successfully via ${altConfig.name}:`, result.messageId);
            return { success: true, messageId: result.messageId };
          } catch (altError) {
            console.error(`❌ ${altConfig.name} failed:`, altError.message);
            continue; // Try next configuration
          }
        }
        
        // All configurations failed
        console.error('❌ All MaralemPay SMTP configurations failed');
        return { 
          success: false, 
          error: `All SMTP configurations failed. Primary: ${primaryError.message}. Please check SMTP server status.` 
        };
      }
      
    } catch (error) {
      console.error('❌ Error in email sending:', error);
      return { success: false, error: error.message };
    }
  }

  // Send email with timeout and proper error handling
  async sendEmailWithTimeout(email, code, type, transporter, configName) {
    const subject = type === 'registration' 
      ? 'MaralemPay - Email Verification Code'
      : 'MaralemPay - Password Reset Code';

    const htmlContent = this.getEmailTemplate(code, type);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
      to: email,
      subject: subject,
      html: htmlContent
    };

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${configName} timeout after 15 seconds`)), 15000)
    );

    // Create email sending promise
    const emailPromise = transporter.sendMail(mailOptions);

    // Race between email sending and timeout
    const result = await Promise.race([emailPromise, timeoutPromise]);
    
    if (result && result.messageId) {
      return { success: true, messageId: result.messageId };
    } else {
      throw new Error(`${configName} failed - no message ID returned`);
    }
  }

  // Send email verification code
  async sendVerificationCode(email, code, type = 'registration') {
    try {
      const subject = type === 'registration' 
        ? 'MaralemPay - Email Verification Code'
        : 'MaralemPay - Password Reset Code';

      const htmlContent = this.getEmailTemplate(code, type);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: email,
        subject: subject,
        html: htmlContent
      };

      // Try primary transporter first
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully via primary SMTP:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (primaryError) {
        console.error('Primary SMTP failed:', primaryError.message);
        
        // Try fallback Gmail if available
        if (this.fallbackTransporter) {
          try {
            // Update from field for Gmail
            const fallbackMailOptions = {
              ...mailOptions,
              from: process.env.GMAIL_USER || 'MaralemPay@maralempay.com.ng'
            };
            
            const result = await this.fallbackTransporter.sendMail(fallbackMailOptions);
            console.log('Verification email sent successfully via Gmail fallback:', result.messageId);
            return { success: true, messageId: result.messageId };
          } catch (fallbackError) {
            console.error('Gmail fallback also failed:', fallbackError.message);
            throw new Error(`Both primary and fallback email services failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
          }
        } else {
          throw primaryError;
        }
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get email template based on type
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
            .button {
                display: inline-block;
                background-color: #4A90E2;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
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

  // Send welcome email after successful registration
  async sendWelcomeEmail(email, firstName) {
    try {
      const subject = 'Welcome to MaralemPay!';
      
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MaralemPay</title>
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
              .welcome {
                  font-size: 24px;
                  color: #2c3e50;
                  margin-bottom: 20px;
              }
              .features {
                  margin: 30px 0;
              }
              .feature {
                  margin: 15px 0;
                  padding: 10px;
                  background-color: #f8f9fa;
                  border-radius: 5px;
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
                  <h1 class="welcome">Welcome, ${firstName}!</h1>
              </div>
              
              <p>Thank you for joining MaralemPay! Your account has been successfully created and verified.</p>
              
              <div class="features">
                  <h3>What you can do with MaralemPay:</h3>
                  <div class="feature">📱 <strong>Airtime Vending:</strong> Buy and sell airtime with great discounts</div>
                  <div class="feature">📊 <strong>Data Vending:</strong> Purchase data bundles for all networks</div>
                  <div class="feature">👥 <strong>Referral System:</strong> Earn ₦100 for each successful referral</div>
                  <div class="feature">📈 <strong>Analytics:</strong> Track your vending performance</div>
                  <div class="feature">🛡️ <strong>Secure:</strong> Your transactions are safe and encrypted</div>
              </div>
              
              <p>Start exploring MaralemPay and begin your vending journey today!</p>
              
              <div class="footer">
                  <p>This email was sent by MaralemPay</p>
                  <p>If you have any questions, please contact our support team.</p>
                  <p>&copy; 2024 MaralemPay. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
        to: email,
        subject: subject,
        html: htmlContent
      };

      // Try primary transporter first
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully via primary SMTP:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (primaryError) {
        console.error('Primary SMTP failed for welcome email:', primaryError.message);
        
        // Try fallback Gmail if available
        if (this.fallbackTransporter) {
          try {
            // Update from field for Gmail
            const fallbackMailOptions = {
              ...mailOptions,
              from: process.env.GMAIL_USER || 'MaralemPay@maralempay.com.ng'
            };
            
            const result = await this.fallbackTransporter.sendMail(fallbackMailOptions);
            console.log('Welcome email sent successfully via Gmail fallback:', result.messageId);
            return { success: true, messageId: result.messageId };
          } catch (fallbackError) {
            console.error('Gmail fallback also failed for welcome email:', fallbackError.message);
            throw new Error(`Both primary and fallback email services failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
          }
        } else {
          throw primaryError;
        }
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email connection with detailed diagnostics for MaralemPay SMTP
  async testConnection() {
    console.log('🔍 Testing MaralemPay SMTP connections...');
    
    // Test primary transporter
    try {
      console.log('📧 Testing primary MaralemPay SMTP connection...');
      console.log('Host:', process.env.EMAIL_HOST || 'mail.maralempay.com.ng');
      console.log('Port:', process.env.EMAIL_PORT || 465);
      console.log('User:', process.env.EMAIL_USER || 'MaralemPay@maralempay.com.ng');
      
      await this.transporter.verify();
      console.log('✅ Primary MaralemPay SMTP connection verified successfully');
      return { success: true, message: 'MaralemPay SMTP is ready' };
    } catch (primaryError) {
      console.error('❌ Primary MaralemPay SMTP connection failed:', primaryError.message);
      
      // Test alternative configurations
      console.log('🔄 Testing alternative SMTP configurations...');
      for (const altConfig of this.alternativeConfigs) {
        try {
          console.log(`📧 Testing ${altConfig.name}...`);
          const testTransporter = nodemailer.createTransport(altConfig.config);
          await testTransporter.verify();
          console.log(`✅ ${altConfig.name} connection verified successfully`);
          return { success: true, message: `${altConfig.name} is ready` };
        } catch (altError) {
          console.error(`❌ ${altConfig.name} connection failed:`, altError.message);
          continue;
        }
      }
      
      // All configurations failed
      console.error('❌ All MaralemPay SMTP configurations failed');
      return { 
        success: false, 
        error: `All SMTP configurations failed. Primary: ${primaryError.message}. Please check SMTP server status.` 
      };
    }
  }

  // Test SMTP connection with different configurations
  async testSMTPConfigurations() {
    const configs = [
      {
        name: 'Current Config (Port 587)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3',
            minVersion: 'TLSv1.2'
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      },
      {
        name: 'Port 465 (SSL)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      },
      {
        name: 'Port 25 (Plain)',
        config: {
          host: process.env.EMAIL_HOST || 'mail.maralempay.com.ng',
          port: 25,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER || 'hello@maralempay.com.ng',
            pass: process.env.EMAIL_PASS || 'EzinwokE1@'
          },
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000
        }
      }
    ];

    const results = [];
    
    for (const config of configs) {
      try {
        console.log(`🔍 Testing ${config.name}...`);
        const testTransporter = nodemailer.createTransport(config.config);
        await testTransporter.verify();
        console.log(`✅ ${config.name} - SUCCESS`);
        results.push({ name: config.name, success: true, error: null });
        testTransporter.close();
      } catch (error) {
        console.log(`❌ ${config.name} - FAILED: ${error.message}`);
        results.push({ name: config.name, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = new EmailService();
