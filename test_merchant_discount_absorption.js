/**
 * Test Script: Merchant Discount Absorption Logic
 * This demonstrates how the system works with dynamic pricing
 */

const FlutterwaveAirtimeController = require('./controllers/flutterwaveAirtimeController');

// Initialize the controller
const controller = new FlutterwaveAirtimeController();

// Test scenarios with different pricing
const testScenarios = [
  {
    name: "MTN Airtime - Subscriber (10% discount)",
    customerId: "user_001",
    billerCode: "MTN_BIL",
    itemCode: "AIR_100",
    fullPlanPrice: 100,      // Full price: ₦100
    customerPaidAmount: 90,  // Customer pays: ₦90 (10% discount)
    currency: "NGN",
    phone: "08068621706",
    txRef: "TEST_MTN_001"
  },
  {
    name: "Airtel Data - Subscriber (10% discount)",
    customerId: "user_002", 
    billerCode: "AIRTEL_BIL",
    itemCode: "DATA_500",
    fullPlanPrice: 500,      // Full price: ₦500
    customerPaidAmount: 450, // Customer pays: ₦450 (10% discount)
    currency: "NGN",
    phone: "08012345678",
    txRef: "TEST_AIRTEL_002"
  },
  {
    name: "GLO Airtime - Non-subscriber (No discount)",
    customerId: "user_003",
    billerCode: "GLO_BIL", 
    itemCode: "AIR_200",
    fullPlanPrice: 200,      // Full price: ₦200
    customerPaidAmount: 200, // Customer pays: ₦200 (No discount)
    currency: "NGN",
    phone: "08098765432",
    txRef: "TEST_GLO_003"
  }
];

async function testMerchantDiscountAbsorption() {
  console.log('🧪 Testing Merchant Discount Absorption Logic\n');
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Test Case: ${scenario.name}`);
    console.log(`   Full Plan Price: ₦${scenario.fullPlanPrice}`);
    console.log(`   Customer Paid: ₦${scenario.customerPaidAmount}`);
    console.log(`   Merchant Covers: ₦${scenario.fullPlanPrice - scenario.customerPaidAmount}`);
    console.log(`   Phone: ${scenario.phone}`);
    
    try {
      // This would call the actual function in a real scenario
      // const result = await controller.fulfillDiscountedBillPayment(
      //   scenario.customerId,
      //   scenario.billerCode,
      //   scenario.itemCode,
      //   scenario.fullPlanPrice,
      //   scenario.customerPaidAmount,
      //   scenario.currency,
      //   scenario.phone,
      //   scenario.txRef
      // );
      
      console.log(`   ✅ Would pay ₦${scenario.fullPlanPrice} to ${scenario.billerCode} for ${scenario.phone}`);
      console.log(`   💰 Merchant absorbs ₦${scenario.fullPlanPrice - scenario.customerPaidAmount} discount`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('   - Customer pays discounted amount (e.g., ₦90)');
  console.log('   - Merchant pays full amount (e.g., ₦100) to biller');
  console.log('   - Merchant absorbs the difference (e.g., ₦10) as business cost');
  console.log('   - Customer receives full service value');
}

// Run the test
testMerchantDiscountAbsorption().catch(console.error);

module.exports = { testMerchantDiscountAbsorption };
