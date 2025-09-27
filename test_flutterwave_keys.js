const axios = require('axios');

// Your Flutterwave keys
const flutterwaveKeys = {
  FLW_PUBLIC_KEY: 'FLWPUBK-7f96c7d7bccb0b1976a07ff82fd983ca-X',
  FLW_SECRET_KEY: 'FLWSECK-d6b4ee5933c0fb806a383d8c8475ed90-19985cff6a6vt-X',
  FLW_ENCRYPTION_KEY: 'd6b4ee5933c00335ed2a4c88'
};

console.log('🔑 Testing Flutterwave keys...');
console.log('📋 Keys being tested:');
console.log('   FLW_PUBLIC_KEY:', flutterwaveKeys.FLW_PUBLIC_KEY);
console.log('   FLW_SECRET_KEY:', flutterwaveKeys.FLW_SECRET_KEY);
console.log('   FLW_ENCRYPTION_KEY:', flutterwaveKeys.FLW_ENCRYPTION_KEY);

// Test the keys by making API calls
async function testFlutterwaveKeys() {
  try {
    console.log('\n🧪 Testing Flutterwave API with your keys...');
    
    // Test 1: Get billers
    console.log('\n📋 Test 1: Getting billers...');
    const billersResponse = await axios.get('https://api.flutterwave.com/v3/billers', {
      headers: {
        'Authorization': `Bearer ${flutterwaveKeys.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Billers API test successful!');
    console.log('   Status:', billersResponse.status);
    console.log('   Billers count:', billersResponse.data.data?.length || 0);
    
    // Test 2: Get bill categories
    console.log('\n📋 Test 2: Getting bill categories...');
    const categoriesResponse = await axios.get('https://api.flutterwave.com/v3/bill-categories', {
      headers: {
        'Authorization': `Bearer ${flutterwaveKeys.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Bill Categories API test successful!');
    console.log('   Status:', categoriesResponse.status);
    console.log('   Categories count:', categoriesResponse.data.data?.length || 0);
    
    // Test 3: Get balance (if available)
    console.log('\n📋 Test 3: Getting account balance...');
    try {
      const balanceResponse = await axios.get('https://api.flutterwave.com/v3/balances', {
        headers: {
          'Authorization': `Bearer ${flutterwaveKeys.FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Balance API test successful!');
      console.log('   Status:', balanceResponse.status);
      if (balanceResponse.data.data && balanceResponse.data.data.length > 0) {
        const ngnBalance = balanceResponse.data.data.find(b => b.currency === 'NGN');
        if (ngnBalance) {
          console.log('   NGN Balance:', ngnBalance.available_balance);
        }
      }
    } catch (balanceError) {
      console.log('⚠️ Balance API not accessible (this is normal for some account types)');
    }
    
    console.log('\n🎉 All Flutterwave API tests passed!');
    console.log('✅ Your keys are working correctly');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Flutterwave API test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.error('   This means the API key is invalid or expired');
      console.error('   Please check your Flutterwave dashboard for the correct keys');
    } else if (error.response?.status === 403) {
      console.error('   This means the API key is valid but lacks permissions');
      console.error('   Please check your Flutterwave account permissions');
    }
    
    return false;
  }
}

// Run the test
testFlutterwaveKeys().then(success => {
  if (success) {
    console.log('\n📋 Next steps:');
    console.log('   1. Update your deployment platform (Render/Vercel) with these environment variables:');
    console.log('      FLW_SECRET_KEY=' + flutterwaveKeys.FLW_SECRET_KEY);
    console.log('      FLW_PUBLIC_KEY=' + flutterwaveKeys.FLW_PUBLIC_KEY);
    console.log('      FLW_ENCRYPTION_KEY=' + flutterwaveKeys.FLW_ENCRYPTION_KEY);
    console.log('   2. Restart your backend server');
    console.log('   3. Test the mobile app - the 401 errors should be resolved');
  } else {
    console.log('\n❌ Please fix the Flutterwave key issues before proceeding');
  }
});
