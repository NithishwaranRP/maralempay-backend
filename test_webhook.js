const axios = require('axios');

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook endpoint...');
    
    const webhookUrl = 'https://maralempay-backend.onrender.com/api/webhook/flutterwave';
    const secretHash = '0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a';
    
    const testPayload = {
      event: 'charge.completed',
      data: {
        status: 'successful',
        tx_ref: 'TEST_TX_REF_123',
        flw_ref: 'FLW_REF_123',
        amount: 1000,
        customer: {
          email: 'test@example.com'
        }
      }
    };
    
    console.log('📡 Sending test webhook to:', webhookUrl);
    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'verif-hash': secretHash
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook test successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testWebhook();
