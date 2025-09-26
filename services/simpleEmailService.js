const nodemailer = require('nodemailer');

class SimpleEmailService {
  constructor() {
    console.log('📧 Using simple email service for testing');
    
    // Create a test transporter that doesn't actually send emails
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  // Generate a 6-digit verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send email verification code (mock implementation for testing)
  async sendVerificationCode(email, code, type = 'registration') {
    try {
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
    } catch (error) {
      console.error('❌ Error in mock email sending:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email connection
  async testConnection() {
    console.log('🔍 Testing simple email service...');
    return { 
      success: true, 
      message: 'Simple email service is ready (mock mode)' 
    };
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
        <title>${title} - MaralemPay</title>
    </head>
    <body>
        <h1>MaralemPay - ${title}</h1>
        <p>${message}</p>
        <h2>Your verification code: ${code}</h2>
        <p><strong>Important:</strong> This code will expire in 10 minutes.</p>
        <p>If you didn't request this ${isRegistration ? 'verification' : 'password reset'}, please ignore this email.</p>
        <p>Best regards,<br>MaralemPay Team</p>
    </body>
    </html>
    `;
  }
}

module.exports = new SimpleEmailService();

