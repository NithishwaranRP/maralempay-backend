const axios = require('axios');

async function testSpecificWebhook() {
  try {
    console.log('🧪 Testing webhook for specific transaction...');
    
    const webhookUrl = 'https://maralempay-backend.onrender.com/api/webhook/flutterwave';
    const secretHash = '0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a';
    
    const testPayload = {
      event: 'charge.completed',
      data: {
        status: 'successful',
        tx_ref: 'WALLET_68d78cc5f6d21a2cb7ec8fa5_1758993280271_beh3seien',
        flw_ref: 'FLW_REF_9678454',
        amount: 1000,
        customer: {
          email: 'nithishnt2002@gmail.com'
        }
      }
    };
    
    console.log('📡 Sending webhook for transaction:', testPayload.data.tx_ref);
    
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'verif-hash': secretHash
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook sent successfully!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testSpecificWebhook();

