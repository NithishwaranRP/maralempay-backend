const axios = require('axios');

async function testEndpoint() {
  try {
    console.log('Testing subscription endpoint...');
    
    const response = await axios.post('https://backend-a2b2bw5bh-nithishwaran-rps-projects.vercel.app/api/subscription/purchase', {
      planType: '6_months'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testEndpoint();
