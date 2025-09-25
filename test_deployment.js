const axios = require('axios');

async function testSubscriptionEndpoint() {
  const baseURL = 'https://backend-a2b2bw5bh-nithishwaran-rps-projects.vercel.app';
  
  console.log('🧪 Testing Subscription Purchase Endpoint...\n');
  
  try {
    // Test without authentication (should get 401)
    console.log('🔍 Test 1: Testing without authentication...');
    const response = await axios.post(`${baseURL}/api/subscription/purchase`, {
      planType: '6_months'
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ Expected 401 error received');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
      console.log('Error Type:', error.response.data.error_type || 'Not specified');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n🔍 Test 2: Testing health endpoint...');
  try {
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.response?.data || error.message);
  }
}

testSubscriptionEndpoint().catch(console.error);
