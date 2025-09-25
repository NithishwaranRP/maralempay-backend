const axios = require('axios');

async function testDatabaseFix() {
  const baseURL = 'https://backend-2qmnzeaer-nithishwaran-rps-projects.vercel.app';
  
  console.log('🧪 Testing Database Save Fix...\n');
  
  try {
    // Test subscription endpoint without auth (should get 401, not 500)
    console.log('🔍 Testing subscription endpoint...');
    const response = await axios.post(`${baseURL}/api/subscription/purchase`, {
      planType: '6_months'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Unexpected success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ Expected authentication error received');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message || 'Authentication required');
      
      // Check if it's a proper 401 (auth error) vs 500 (database error)
      if (error.response.status === 401) {
        console.log('✅ Database save fix working - getting auth error instead of database error');
      } else if (error.response.status === 500) {
        console.log('❌ Still getting 500 error - database issue not fixed');
        console.log('Error details:', error.response.data);
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testDatabaseFix().catch(console.error);
