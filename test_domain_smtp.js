// Test script to verify MaralemPay domain SMTP functionality
require('dotenv').config();
const emailService = require('./services/realEmailService');

async function testDomainSMTP() {
  console.log('🧪 Testing MaralemPay domain SMTP functionality...\n');

  // Test 1: Check configuration
  console.log('1. Checking MaralemPay domain SMTP configuration:');
  console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || 'Not set (default: mail.maralempay.com.ng)'}`);
  console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || 'Not set (default: 465)'}`);
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'Not set'}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? 'Set (hidden)' : 'Not set'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
  console.log(`   EMAIL_FROM_NAME: ${process.env.EMAIL_FROM_NAME || 'Not set (default: MaralemPay)'}`);
  console.log(`   USE_MOCK_EMAIL: ${process.env.USE_MOCK_EMAIL || 'Not set (default: false)'}`);
  console.log('');

  // Test 2: Test connection
  console.log('2. Testing MaralemPay domain SMTP connection:');
  const connectionTest = await emailService.testConnection();
  if (connectionTest.success) {
    console.log(`   ✅ ${connectionTest.message}`);
  } else {
    console.log(`   ❌ Connection failed: ${connectionTest.error}`);
    console.log('   💡 Make sure to set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in your .env file');
    return;
  }
  console.log('');

  // Test 3: Send test password reset email
  console.log('3. Sending test password reset email:');
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const testCode = emailService.generateVerificationCode();
  
  console.log(`   📧 Sending password reset email to: ${testEmail}`);
  console.log(`   🔑 Verification code: ${testCode}`);
  console.log(`   📤 From: ${process.env.EMAIL_FROM_NAME || 'MaralemPay'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`);
  
  const emailResult = await emailService.sendVerificationCode(
    testEmail, 
    testCode, 
    'password_reset'
  );

  if (emailResult.success) {
    console.log(`   ✅ Password reset email sent successfully!`);
    console.log(`   📧 Message ID: ${emailResult.messageId}`);
    console.log(`   💬 Message: ${emailResult.message}`);
  } else {
    console.log(`   ❌ Password reset email failed: ${emailResult.error}`);
  }
  console.log('');

  // Test 4: Send test registration email
  console.log('4. Sending test registration email:');
  const regCode = emailService.generateVerificationCode();
  
  console.log(`   📧 Sending registration email to: ${testEmail}`);
  console.log(`   🔑 Verification code: ${regCode}`);
  
  const regResult = await emailService.sendVerificationCode(
    testEmail, 
    regCode, 
    'registration'
  );

  if (regResult.success) {
    console.log(`   ✅ Registration email sent successfully!`);
    console.log(`   📧 Message ID: ${regResult.messageId}`);
  } else {
    console.log(`   ❌ Registration email failed: ${regResult.error}`);
  }

  console.log('\n🎉 MaralemPay domain SMTP testing completed!');
  console.log('\n📋 Summary:');
  console.log(`   Primary SMTP: ${process.env.EMAIL_HOST || 'mail.maralempay.com.ng'}:${process.env.EMAIL_PORT || '465'}`);
  console.log(`   From Address: ${process.env.EMAIL_FROM_NAME || 'MaralemPay'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`);
  console.log(`   Mock Mode: ${process.env.USE_MOCK_EMAIL === 'true' ? 'Enabled' : 'Disabled'}`);
}

// Run the test
testDomainSMTP().catch(console.error);
