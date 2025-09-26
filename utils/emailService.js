const axios = require('axios');

// SendPulse API configuration
const SENDPULSE_CONFIG = {
  apiUrl: 'https://api.sendpulse.com',
  clientId: process.env.SENDPULSE_CLIENT_ID,
  clientSecret: process.env.SENDPULSE_CLIENT_SECRET,
  fromEmail: process.env.EMAIL_FROM || 'hello@maralempay.com.ng',
  fromName: process.env.EMAIL_FROM_NAME || 'MaralemPay',
};

let accessToken = null;
let tokenExpiry = null;

/**
 * Get SendPulse access token
 */
const getAccessToken = async () => {
  try {
    // Check if we have a valid token
    if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
      return accessToken;
    }

    // Get new token
    const response = await axios.post(`${SENDPULSE_CONFIG.apiUrl}/oauth/access_token`, {
      grant_type: 'client_credentials',
      client_id: SENDPULSE_CONFIG.clientId,
      client_secret: SENDPULSE_CONFIG.clientSecret,
    });

    accessToken = response.data.access_token;
    tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000); // 1 minute buffer

    console.log('✅ SendPulse access token obtained');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting SendPulse access token:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send email with template using SendPulse API
 */
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const token = await getAccessToken();
    const htmlContent = generateEmailTemplate(template, data);
    
    // Base64 encode the content as required by SendPulse
    const htmlBase64 = Buffer.from(htmlContent, 'utf8').toString('base64');
    
    const emailData = {
      email: {
        subject: subject,
        from: {
          name: SENDPULSE_CONFIG.fromName,
          email: SENDPULSE_CONFIG.fromEmail,
        },
        to: [
          {
            name: data.userName || 'User',
            email: to,
          }
        ],
        html: htmlBase64,
      }
    };

    const response = await axios.post(
      `${SENDPULSE_CONFIG.apiUrl}/smtp/emails`,
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Email sent successfully via SendPulse:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending email via SendPulse:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Generate email template based on type
 */
const generateEmailTemplate = (template, data) => {
  switch (template) {
    case 'subscription_success':
      return generateSubscriptionSuccessTemplate(data);
    case 'bill_payment_success':
      return generateBillPaymentSuccessTemplate(data);
    case 'bill_payment_failed':
      return generateBillPaymentFailedTemplate(data);
    default:
      return generateDefaultTemplate(data);
  }
};

/**
 * Subscription success email template
 */
const generateSubscriptionSuccessTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Successful</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .benefit { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .amount { font-size: 24px; font-weight: bold; color: #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to MaralemPay Premium!</h1>
          <p>Your subscription has been activated successfully</p>
        </div>
        <div class="content">
          <h2>Hello ${data.userName}!</h2>
          <p>Congratulations! Your premium subscription has been activated and you now have access to exclusive benefits.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Subscription Details:</h3>
            <p><strong>Amount Paid:</strong> <span class="amount">₦${data.amount}</span></p>
            <p><strong>Valid Until:</strong> ${data.expiryDate}</p>
            <p><strong>Duration:</strong> 6 months</p>
          </div>

          <h3>Your Premium Benefits:</h3>
          ${data.benefits.map(benefit => `
            <div class="benefit">
              <strong>✓ ${benefit}</strong>
            </div>
          `).join('')}

          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 Start Saving Today!</h3>
            <p>You can now enjoy 10% discount on all airtime and data purchases. Start buying for yourself and your loved ones!</p>
          </div>

          <p>Thank you for choosing MaralemPay. If you have any questions, feel free to contact our support team.</p>
          </div>
        <div class="footer">
          <p>© 2024 MaralemPay. All rights reserved.</p>
          <p>This email was sent to ${data.userName}. If you have any questions, contact us at support@maralempay.com.ng</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Bill payment success email template
 */
const generateBillPaymentSuccessTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Complete</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
        .amount { font-size: 24px; font-weight: bold; color: #667eea; }
        .savings { color: #4caf50; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Purchase Complete!</h1>
          <p>Your ${data.productName} has been delivered successfully</p>
        </div>
        <div class="content">
          <h2>Hello ${data.userName}!</h2>
          
          <div class="success-box">
            <h3>✅ Transaction Successful</h3>
            <p>Your ${data.productName} has been delivered to <strong>${data.customerId}</strong></p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Transaction Details:</h3>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Recipient:</strong> ${data.customerId}</p>
            <p><strong>Full Price:</strong> <span class="amount">₦${data.fullPrice}</span></p>
            <p><strong>You Paid:</strong> <span class="amount">₦${data.discountedAmount}</span></p>
            <p><strong>You Saved:</strong> <span class="savings">₦${data.discountAmount}</span></p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Completed:</strong> ${data.completedAt.toLocaleString()}</p>
          </div>

          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>💡 Premium Benefit</h3>
            <p>Thanks to your premium subscription, you saved <strong>₦${data.discountAmount}</strong> on this purchase!</p>
          </div>

          <p>Thank you for using MaralemPay. Keep enjoying your premium benefits!</p>
        </div>
        <div class="footer">
          <p>© 2024 MaralemPay. All rights reserved.</p>
          <p>This email was sent to ${data.userName}. If you have any questions, contact us at support@maralempay.com.ng</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Bill payment failed email template
 */
const generateBillPaymentFailedTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Issue</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .error-box { background: #ffe6e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b; }
        .support-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Purchase Issue</h1>
          <p>We encountered an issue with your ${data.productName} purchase</p>
        </div>
        <div class="content">
          <h2>Hello ${data.userName}!</h2>
          
          <div class="error-box">
            <h3>❌ Transaction Failed</h3>
            <p>We encountered an issue while processing your ${data.productName} purchase for <strong>${data.customerId}</strong>.</p>
            <p><strong>Error:</strong> ${data.errorMessage}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Transaction Details:</h3>
            <p><strong>Product:</strong> ${data.productName}</p>
            <p><strong>Recipient:</strong> ${data.customerId}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Status:</strong> Failed</p>
          </div>

          <div class="support-box">
            <h3>🛠️ What's Next?</h3>
            <p>Don't worry! Your payment has been processed and we're working to resolve this issue.</p>
            <p><strong>Options:</strong></p>
            <ul>
              <li>We'll automatically retry the transaction</li>
              <li>If the issue persists, we'll process a full refund</li>
              <li>Contact our support team for immediate assistance</li>
            </ul>
            <p><strong>Support Email:</strong> <a href="mailto:${data.supportEmail}">${data.supportEmail}</a></p>
          </div>

          <p>We apologize for any inconvenience. Our team is working to resolve this issue as quickly as possible.</p>
          </div>
        <div class="footer">
          <p>© 2024 MaralemPay. All rights reserved.</p>
          <p>This email was sent to ${data.userName}. If you have any questions, contact us at support@maralempay.com.ng</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Default email template
 */
const generateDefaultTemplate = (data) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MaralemPay Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MaralemPay</h1>
          <p>Your trusted payment partner</p>
        </div>
        <div class="content">
          <h2>Hello!</h2>
          <p>This is a notification from MaralemPay.</p>
          <p>Thank you for using our services.</p>
        </div>
        <div class="footer">
          <p>© 2024 MaralemPay. All rights reserved.</p>
          <p>If you have any questions, contact us at support@maralempay.com.ng</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
};