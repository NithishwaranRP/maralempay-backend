const axios = require('axios');

async function checkWebhookStatus() {
  try {
    console.log('🔍 Checking webhook endpoint status...');
    
    const baseUrl = 'https://maralempay.com.ng/api';
    
    // Test 1: Check if the API is accessible
    console.log('\n1️⃣ Testing API accessibility...');
    try {
      const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
      console.log('✅ API is accessible');
      console.log('Status:', response.status);
    } catch (error) {
      console.log('❌ API not accessible:', error.message);
    }
    
    // Test 2: Check webhook endpoint with GET (should return 405)
    console.log('\n2️⃣ Testing webhook endpoint...');
    try {
      const response = await axios.get(`${baseUrl}/webhook/flutterwave`, { timeout: 5000 });
      console.log('✅ Webhook endpoint accessible');
      console.log('Status:', response.status);
    } catch (error) {
      if (error.response?.status === 405) {
        console.log('✅ Webhook endpoint exists (405 Method Not Allowed is expected for GET)');
      } else {
        console.log('❌ Webhook endpoint error:', error.message);
        console.log('Status:', error.response?.status);
      }
    }
    
    // Test 3: Check if webhook controller exists
    console.log('\n3️⃣ Testing webhook with POST...');
    try {
      const response = await axios.post(`${baseUrl}/webhook/flutterwave`, {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      console.log('✅ Webhook POST endpoint accessible');
      console.log('Status:', response.status);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Webhook endpoint exists (400 Bad Request is expected without proper payload)');
      } else {
        console.log('❌ Webhook POST error:', error.message);
        console.log('Status:', error.response?.status);
        console.log('Data:', error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

checkWebhookStatus();
