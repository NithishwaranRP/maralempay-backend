// Update Flutterwave keys in backend environment
// This script will help you set the correct Flutterwave keys

const fs = require('fs');
const path = require('path');

// Your Flutterwave keys
const flutterwaveKeys = {
  FLW_PUBLIC_KEY: 'FLWPUBK-7f96c7d7bccb0b1976a07ff82fd983ca-X',
  FLW_SECRET_KEY: 'FLWSECK-d6b4ee5933c0fb806a383d8c8475ed90-19985cff6a6vt-X',
  FLW_ENCRYPTION_KEY: 'd6b4ee5933c00335ed2a4c88',
  FLW_BASE_URL: 'https://api.flutterwave.com/v3'
};

console.log('🔑 Updating Flutterwave keys in backend...');
console.log('📋 Keys to update:');
console.log('   FLW_PUBLIC_KEY:', flutterwaveKeys.FLW_PUBLIC_KEY);
console.log('   FLW_SECRET_KEY:', flutterwaveKeys.FLW_SECRET_KEY);
console.log('   FLW_ENCRYPTION_KEY:', flutterwaveKeys.FLW_ENCRYPTION_KEY);
console.log('   FLW_BASE_URL:', flutterwaveKeys.FLW_BASE_URL);

// Create .env file with the correct keys
const envContent = `# Flutterwave Configuration
FLW_SECRET_KEY=${flutterwaveKeys.FLW_SECRET_KEY}
FLW_PUBLIC_KEY=${flutterwaveKeys.FLW_PUBLIC_KEY}
FLW_ENCRYPTION_KEY=${flutterwaveKeys.FLW_ENCRYPTION_KEY}
FLW_SECRET_HASH=your-webhook-secret-hash

# Backend Configuration
BACKEND_URL=https://maralempay-backend.onrender.com
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN

# App Configuration
APP_LOGO_URL=https://maralempay.com/logo.png

# Optional: Logging
LOG_LEVEL=debug

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Email Configuration - MaralemPay Domain SMTP (Primary)
EMAIL_HOST=mail.maralempay.com.ng
EMAIL_PORT=465
EMAIL_USER=hello@maralempay.com.ng
EMAIL_PASS=EzinwokE1@
EMAIL_FROM=hello@maralempay.com.ng
EMAIL_FROM_NAME=MaralemPay

# Email Configuration - SendPulse API (Primary)
SENDPULSE_CLIENT_ID=your-sendpulse-client-id
SENDPULSE_CLIENT_SECRET=your-sendpulse-client-secret

# Email Configuration - Resend (Alternative for Vercel)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=MaralemPay <noreply@maralempay.com.ng>

# Email Testing Configuration
USE_MOCK_EMAIL=false

# Test Configuration (for testing scripts)
TEST_EMAIL=test@example.com
TEST_PHONE=08012345678
TEST_NAME=Test User
TEST_USER_ID=test_user_123
`;

// Write .env file
fs.writeFileSync('.env', envContent);
console.log('✅ .env file created with updated Flutterwave keys');

// Test the keys by making a simple API call
async function testFlutterwaveKeys() {
  try {
    console.log('\n🧪 Testing Flutterwave keys...');
    
    const axios = require('axios');
    
    const response = await axios.get('https://api.flutterwave.com/v3/billers', {
      headers: {
        'Authorization': `Bearer ${flutterwaveKeys.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Flutterwave API test successful!');
    console.log('   Status:', response.status);
    console.log('   Billers count:', response.data.data?.length || 0);
    
  } catch (error) {
    console.error('❌ Flutterwave API test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.error('   This usually means the API key is invalid or expired');
    }
  }
}

// Run the test
testFlutterwaveKeys();

console.log('\n📋 Next steps:');
console.log('   1. Update your deployment platform (Render/Vercel) with these environment variables');
console.log('   2. Restart your backend server');
console.log('   3. Test the Flutterwave integration');
console.log('   4. Verify that the 401 errors are resolved');

