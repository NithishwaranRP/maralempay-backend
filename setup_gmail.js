// Gmail Setup Helper Script
require('dotenv').config();

console.log('🔧 Gmail SMTP Setup Helper\n');

// Check current configuration
console.log('📋 Current Configuration:');
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'Not set'}`);
console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? 'Set (hidden)' : 'Not set'}`);
console.log(`   USE_MOCK_EMAIL: ${process.env.USE_MOCK_EMAIL || 'Not set'}`);
console.log('');

// Provide setup instructions
console.log('📝 Gmail Setup Instructions:');
console.log('');
console.log('1. 🔐 Enable 2-Factor Authentication:');
console.log('   - Go to: https://myaccount.google.com/security');
console.log('   - Turn on "2-Step Verification"');
console.log('');
console.log('2. 🔑 Generate App Password:');
console.log('   - Go to: https://myaccount.google.com/apppasswords');
console.log('   - Select "Mail" or "Other (Custom name)"');
console.log('   - Enter "MaralemPay" as the app name');
console.log('   - Copy the 16-character password');
console.log('');
console.log('3. 📝 Update your .env file:');
console.log('   EMAIL_USER=your-gmail@gmail.com');
console.log('   EMAIL_PASS=abcdefghijklmnop  # No spaces!');
console.log('   USE_MOCK_EMAIL=false');
console.log('');
console.log('4. 🧪 Test the configuration:');
console.log('   node test_email_sending.js');
console.log('');

// Check if credentials are properly formatted
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  console.log('✅ Gmail credentials are set');
  
  // Check email format
  if (process.env.EMAIL_USER.includes('@gmail.com')) {
    console.log('✅ Gmail address format looks correct');
  } else {
    console.log('⚠️  EMAIL_USER should be a Gmail address (e.g., user@gmail.com)');
  }
  
  // Check password format
  if (process.env.EMAIL_PASS.length === 16 && !process.env.EMAIL_PASS.includes(' ')) {
    console.log('✅ App password format looks correct (16 characters, no spaces)');
  } else {
    console.log('⚠️  EMAIL_PASS should be 16 characters with no spaces');
    console.log('   Example: abcd efgh ijkl mnop → abcdefghijklmnop');
  }
} else {
  console.log('❌ Gmail credentials are missing');
  console.log('   Please set EMAIL_USER and EMAIL_PASS in your .env file');
}

console.log('');
console.log('🚀 After setting up credentials, restart your server:');
console.log('   node server.js');
