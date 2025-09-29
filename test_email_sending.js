// Test script to verify real email sending functionality
require('dotenv').config();
const emailService = require('./services/realEmailService');

async function testEmailSending() {
  console.log('🧪 Testing email sending functionality...\n');

  // Test 1: Check if mock mode is enabled
  console.log('1. Checking email service configuration:');
  console.log(`   USE_MOCK_EMAIL: ${process.env.USE_MOCK_EMAIL}`);
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? 'Set' : 'Not set'}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? 'Set' : 'Not set'}`);
  console.log('');

  // Test 2: Test connection
  console.log('2. Testing email connection:');
  const connectionTest = await emailService.testConnection();
  if (connectionTest.success) {
    console.log(`   ✅ ${connectionTest.message}`);
  } else {
    console.log(`   ❌ Connection failed: ${connectionTest.error}`);
    console.log('   💡 Make sure to set EMAIL_USER and EMAIL_PASS in your .env file');
    return;
  }
  console.log('');

  // Test 3: Send test email
  console.log('3. Sending test email:');
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const testCode = emailService.generateVerificationCode();
  
  console.log(`   📧 Sending password reset email to: ${testEmail}`);
  console.log(`   🔑 Verification code: ${testCode}`);
  
  const emailResult = await emailService.sendVerificationCode(
    testEmail, 
    testCode, 
    'password_reset'
  );

  if (emailResult.success) {
    console.log(`   ✅ Email sent successfully!`);
    console.log(`   📧 Message ID: ${emailResult.messageId}`);
    console.log(`   💬 Message: ${emailResult.message}`);
  } else {
    console.log(`   ❌ Email sending failed: ${emailResult.error}`);
  }
  console.log('');

  // Test 4: Send registration email
  console.log('4. Sending registration email:');
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

  console.log('\n🎉 Email testing completed!');
}

// Run the test
testEmailSending().catch(console.error);
