const crypto = require('crypto');

/**
 * Generate Flutterwave Webhook Configuration
 * This script generates all necessary values for webhook setup
 */

console.log('🔔 Flutterwave Webhook Configuration Generator\n');

// 1. Generate Secret Hash
console.log('1️⃣ GENERATING SECRET HASH:');
const secretHash = crypto.randomBytes(32).toString('hex');
console.log(`✅ Generated FLW_SECRET_HASH: ${secretHash}`);
console.log('📋 Add this to your .env file:');
console.log(`FLW_SECRET_HASH=${secretHash}\n`);

// 2. Generate ngrok command
console.log('2️⃣ NGROK COMMAND:');
const port = process.env.PORT || 3000;
console.log(`✅ Run this command in your terminal:`);
console.log(`ngrok http ${port}\n`);

// 3. Generate webhook URL
console.log('3️⃣ WEBHOOK URL FOR FLUTTERWAVE DASHBOARD:');
console.log('✅ Use this URL format in Flutterwave dashboard:');
console.log('https://[your-ngrok-subdomain].ngrok-free.app/api/webhook/flutterwave');
console.log('📋 Example: https://abc123def.ngrok-free.app/api/webhook/flutterwave\n');

// 4. Generate verification code
console.log('4️⃣ WEBHOOK VERIFICATION CODE:');
console.log('✅ Here\'s the verification logic (already implemented in webhookController.js):\n');

const verificationCode = `
// Webhook signature verification (already implemented)
const crypto = require('crypto');

const verifyWebhookSignature = (payload, signature, secretHash) => {
  try {
    const hash = crypto
      .createHmac('sha256', secretHash)
      .update(payload, 'utf8')
      .digest('hex');
    
    return hash === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// Usage in your webhook endpoint
app.post('/api/webhook/flutterwave', (req, res) => {
  const signature = req.headers['verif-hash'] || req.headers['flutterwave-signature'];
  const secretHash = process.env.FLW_SECRET_HASH;
  
  if (!secretHash) {
    return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
  }
  
  // Verify webhook signature
  const payload = JSON.stringify(req.body);
  if (!verifyWebhookSignature(payload, signature, secretHash)) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  
  // Process webhook data
  const { event, data } = req.body;
  console.log('Webhook received:', event, data);
  
  res.status(200).json({ success: true, message: 'Webhook processed' });
});
`;

console.log(verificationCode);

// 5. Environment variables
console.log('5️⃣ ENVIRONMENT VARIABLES:');
console.log('✅ Add these to your .env file:\n');
console.log('# Flutterwave Configuration');
console.log(`FLW_SECRET_HASH=${secretHash}`);
console.log('FLW_SECRET_KEY=your_flutterwave_secret_key');
console.log('FLW_PUBLIC_KEY=your_flutterwave_public_key');
console.log('FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key');
console.log('FLW_BASE_URL=https://api.flutterwave.com/v3');
console.log('');
console.log('# Backend Configuration');
console.log(`BASE_URL=https://your-ngrok-subdomain.ngrok-free.app`);
console.log('MONGODB_URI=your_mongodb_connection_string');
console.log('');

// 6. Testing instructions
console.log('6️⃣ TESTING INSTRUCTIONS:');
console.log('✅ Follow these steps to test your webhook:\n');
console.log('1. Start your backend server:');
console.log('   npm start');
console.log('');
console.log('2. In another terminal, start ngrok:');
console.log(`   ngrok http ${port}`);
console.log('');
console.log('3. Copy the ngrok URL and update your .env file');
console.log('4. Restart your backend server');
console.log('');
console.log('5. In Flutterwave dashboard:');
console.log('   - Go to Settings → Webhooks');
console.log('   - Add webhook URL: https://your-ngrok-subdomain.ngrok-free.app/api/webhook/flutterwave');
console.log('   - Set secret hash: ' + secretHash);
console.log('   - Select events: charge.completed, charge.failed');
console.log('');
console.log('6. Test with a sample transaction');
console.log('');

// 7. Production deployment
console.log('7️⃣ PRODUCTION DEPLOYMENT:');
console.log('✅ For production, update these values:\n');
console.log('1. Set FLW_SECRET_HASH in your production environment');
console.log('2. Update webhook URL to your production domain:');
console.log('   https://your-production-domain.com/api/webhook/flutterwave');
console.log('3. Update BASE_URL in your .env file');
console.log('');

console.log('🎉 Webhook configuration complete!');
console.log('📖 See WEBHOOK_SETUP_GUIDE.md for detailed instructions');
