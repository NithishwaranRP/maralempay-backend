// Test script to verify SendPulse email integration
require('dotenv').config();
const emailService = require('./services/sendpulseEmailService');

async function testSendPulseIntegration() {
  console.log('🧪 Testing SendPulse Email Integration...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   SENDPULSE_CLIENT_ID: ${process.env.SENDPULSE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SENDPULSE_CLIENT_SECRET: ${process.env.SENDPULSE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'hello@maralempay.com.ng'}`);
  console.log(`   EMAIL_FROM_NAME: ${process.env.EMAIL_FROM_NAME || 'MaralemPay Support'}\n`);

  try {
    // Test 1: Connection Test
    console.log('🔍 Test 1: API Connection Test');
    const connectionResult = await emailService.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ Connection test passed');
      console.log(`   Provider: ${connectionResult.provider}`);
      console.log(`   Message: ${connectionResult.message}\n`);
    } else {
      console.log('❌ Connection test failed');
      console.log(`   Error: ${connectionResult.error}\n`);
      return;
    }

    // Test 2: Access Token Test
    console.log('🔍 Test 2: Access Token Test');
    try {
      const accessToken = await emailService.getAccessToken();
      console.log('✅ Access token obtained successfully');
      console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);
    } catch (error) {
      console.log('❌ Access token test failed');
      console.log(`   Error: ${error.message}\n`);
      return;
    }

    // Test 3: Send Test Email (if test email provided)
    const testEmail = process.env.TEST_EMAIL;
    if (testEmail) {
      console.log('🔍 Test 3: Send Test Email');
      console.log(`   Sending test email to: ${testEmail}`);
      
      try {
        const emailResult = await emailService.sendVerificationCode(
          testEmail, 
          '123456', 
          'registration'
        );
        
        if (emailResult.success) {
          console.log('✅ Test email sent successfully');
          console.log(`   Message ID: ${emailResult.messageId}`);
          console.log(`   Provider: ${emailResult.provider}\n`);
        } else {
          console.log('❌ Test email failed');
          console.log(`   Error: ${emailResult.error}\n`);
        }
      } catch (error) {
        console.log('❌ Test email failed with exception');
        console.log(`   Error: ${error.message}\n`);
      }
    } else {
      console.log('⚠️  Test 3: Skipped (no TEST_EMAIL environment variable set)\n');
    }

    console.log('🎉 SendPulse integration test completed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Set TEST_EMAIL environment variable to test actual email sending');
    console.log('   2. Update your .env file with correct SendPulse credentials');
    console.log('   3. Deploy the updated backend to use SendPulse for all emails');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testSendPulseIntegration().catch(console.error);
