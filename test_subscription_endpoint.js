const axios = require('axios');

// Test the subscription update endpoint
async function testSubscriptionEndpoint() {
  try {
    console.log('🧪 Testing subscription update endpoint...');
    
    // You'll need to get a valid JWT token first
    const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
    
    const testData = {
      transactionId: '1885524156',
      txRef: 'SUB_68d78cc5f6d21a2cb7ec8fa5_1758956788387_qam4rhelc',
      status: 'successful',
      paymentData: {
        url: 'https://frontend-sand-gamma-23.vercel.app//subscription/callback?status=successful&status=completed&tx_ref=SUB_68d78cc5f6d21a2cb7ec8fa5_1758956788387_qam4rhelc&transaction_id=1885524156',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:3000/api/subscription/update-status', testData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test subscription verification endpoint
async function testSubscriptionVerification() {
  try {
    console.log('\n🧪 Testing subscription verification endpoint...');
    
    const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
    
    const response = await axios.get('http://localhost:3000/api/subscription/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting subscription endpoint tests...\n');
  
  // Note: You need to replace 'YOUR_JWT_TOKEN_HERE' with an actual JWT token
  // You can get this by logging in through your app or API
  
  console.log('⚠️  Note: Replace "YOUR_JWT_TOKEN_HERE" with an actual JWT token');
  console.log('   You can get this by logging in through your app or API\n');
  
  // Uncomment these lines after setting up the token:
  // await testSubscriptionEndpoint();
  // await testSubscriptionVerification();
  
  console.log('📋 To get a JWT token:');
  console.log('   1. Login through your mobile app');
  console.log('   2. Check the network requests for Authorization header');
  console.log('   3. Copy the Bearer token value');
  console.log('   4. Replace "YOUR_JWT_TOKEN_HERE" in this script');
  console.log('   5. Run the tests again');
}

runTests();
