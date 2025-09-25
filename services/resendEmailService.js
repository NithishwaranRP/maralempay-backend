const { Resend } = require('resend');

class ResendEmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'MaralemPay <noreply@maralempay.com.ng>';
    
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set');
    } else {
      console.log('✅ Resend email service initialized');
    }
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Get email template based on type
  getEmailTemplate(code, type = 'password_reset') {
    const isPasswordReset = type === 'password_reset';
    const title = isPasswordReset ? 'Password Reset Code' : 'Email Verification Code';
    const description = isPasswordReset 
      ? 'Use this code to reset your password. This code will expire in 10 minutes.'
      : 'Use this code to verify your email address. This code will expire in 10 minutes.';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
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
                padding: 40px;
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
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .code-container {
                background-color: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            .verification-code {
                font-size: 36px;
                font-weight: bold;
                color: #2c3e50;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
                margin: 0;
            }
            .description {
                font-size: 16px;
                color: #6c757d;
                margin-bottom: 30px;
                text-align: center;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                color: #6c757d;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background-color: #007bff;
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
            
            <p class="description">${description}</p>
            
            <div class="code-container">
                <p class="verification-code">${code}</p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone. MaralemPay will never ask for your verification code.
            </div>
            
            <p>If you didn't request this ${isPasswordReset ? 'password reset' : 'verification code'}, please ignore this email or contact our support team.</p>
            
            <div class="footer">
                <p>This email was sent by MaralemPay</p>
                <p>© 2024 MaralemPay. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Send verification code via Resend
  async sendVerificationCode(email, code, type = 'password_reset') {
    try {
      const subject = type === 'registration' 
        ? 'MaralemPay - Email Verification Code'
        : 'MaralemPay - Password Reset Code';

      const htmlContent = this.getEmailTemplate(code, type);

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: subject,
        html: htmlContent,
      });

      if (error) {
        console.error('❌ Resend email error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email sent successfully via Resend:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Error sending email via Resend:', error);
      return { success: false, error: error.message };
    }
  }

  // Test Resend connection
  async testConnection() {
    try {
      console.log('🔍 Testing Resend connection...');
      
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
      }

      // Try to send a test email to verify the API key
      const testResult = await this.resend.emails.send({
        from: this.fromEmail,
        to: ['test@example.com'],
        subject: 'Test Email - MaralemPay',
        html: '<p>This is a test email to verify Resend configuration.</p>',
      });

      if (testResult.error) {
        console.error('❌ Resend test failed:', testResult.error);
        return { success: false, error: testResult.error.message };
      }

      console.log('✅ Resend connection test successful');
      return { success: true, message: 'Resend is configured and working' };
    } catch (error) {
      console.error('❌ Resend connection test error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ResendEmailService();


