require('dotenv').config();
const axios = require('axios');

// Test different biller codes to find working ones
const testBillers = async () => {
  const billers = ['BIL108', 'BIL109', 'BIL110', 'BIL099', 'BIL100', 'BIL101'];
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  
  console.log('🔍 Testing biller codes...');
  
  for (const biller of billers) {
    try {
      console.log(`\n🧪 Testing ${biller}...`);
      
      const response = await axios.get(
        `https://api.flutterwave.com/v3/billers/${biller}/items`,
        {
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ ${biller}: SUCCESS - ${response.data.data?.length || 0} items found`);
      if (response.data.data?.length > 0) {
        console.log(`   Sample item: ${response.data.data[0].name || response.data.data[0].item_code}`);
      }
      
    } catch (error) {
      console.log(`❌ ${biller}: FAILED - ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.data?.message) {
        console.log(`   Error: ${error.response.data.message}`);
      }
    }
  }
};

testBillers();
