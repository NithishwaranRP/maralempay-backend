require('dotenv').config();
const axios = require('axios');

// Test the BIL110 endpoint directly
async function testBIL110Endpoint() {
  try {
    console.log('🧪 Testing BIL110 endpoint...');
    
    // Test 1: Direct Flutterwave API call
    console.log('\n1️⃣ Testing direct Flutterwave API...');
    const flutterwaveResponse = await axios.get(
      'https://api.flutterwave.com/v3/billers/BIL110/items',
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Flutterwave API Response:');
    console.log('   Status:', flutterwaveResponse.status);
    console.log('   Items count:', flutterwaveResponse.data.data?.length || 0);
    if (flutterwaveResponse.data.data?.length > 0) {
      console.log('   Sample item:', flutterwaveResponse.data.data[0].name || flutterwaveResponse.data.data[0].item_code);
    }
    
    // Test 2: Our backend endpoint (without auth for now)
    console.log('\n2️⃣ Testing our backend endpoint...');
    try {
      const backendResponse = await axios.get(
        'https://backend-nithishwaran-rps-projects.vercel.app/api/bills/items/BIL110',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Backend API Response:');
      console.log('   Status:', backendResponse.status);
      console.log('   Data:', backendResponse.data);
      
    } catch (backendError) {
      console.log('❌ Backend API Error:');
      console.log('   Status:', backendError.response?.status);
      console.log('   Message:', backendError.response?.data?.message);
      console.log('   Full response:', backendError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }
}

testBIL110Endpoint();

