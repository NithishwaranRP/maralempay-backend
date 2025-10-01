const axios = require('axios');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Flutterwave API configuration
const baseURL = 'https://api.flutterwave.com/v3';
const secretKey = process.env.FLW_SECRET_KEY;
const publicKey = process.env.FLW_PUBLIC_KEY;

if (!secretKey) {
  throw new Error('FLW_SECRET_KEY environment variable is required');
}

const headers = {
  'Authorization': `Bearer ${secretKey}`,
  'Content-Type': 'application/json'
};

// Telecom provider biller codes
const TELECOM_PROVIDERS = {
  'MTN': 'BIL108',
  'AIRTEL': 'BIL110', 
  'GLO': 'BIL109',
  '9MOBILE': 'BIL111',
  'SMILE': 'BIL124'
};

// Airtime provider biller codes (different from data codes)
const AIRTIME_PROVIDERS = {
  'MTN': 'BIL099',    // MTN Airtime
  'AIRTEL': 'BIL100', // Airtel Airtime
  'GLO': 'BIL101',    // Glo Airtime
  '9MOBILE': 'BIL102' // 9Mobile Airtime
};

/**
 * Get data bundles for a specific biller using Flutterwave bill-categories API
 * Endpoint: GET /api/flutterwave-direct/data-bundles/:biller_code
 */
const getDataBundles = async (req, res) => {
  const { biller_code } = req.params;

  if (!biller_code) {
    return res.status(400).json({ 
      success: false,
      message: 'Biller code is required' 
    });
  }

  try {
    console.log('🔍 Fetching data bundles for biller:', biller_code);

    // Use Flutterwave bill-categories API directly
    const response = await axios.get(
      `${baseURL}/bill-categories?biller_code=${biller_code}`,
      { headers: headers }
    );

    console.log('✅ Data bundles fetched successfully:', {
      biller_code,
      bundlesCount: response.data.data?.length || 0
    });

    // Filter for data bundles only (is_airtime = false and contains GB/MB)
    const dataBundles = response.data.data?.filter(item => {
      const isData = item.is_airtime === false;
      const hasDataSize = item.name && (item.name.includes('GB') || item.name.includes('MB'));
      return isData && hasDataSize;
    }) || [];

    // Transform data for frontend
    const transformedBundles = dataBundles.map(bundle => ({
      id: bundle.id,
      code: bundle.code,
      name: bundle.name,
      amount: bundle.amount,
      currency: bundle.currency,
      is_airtime: bundle.is_airtime,
      biller_code: bundle.biller_code,
      description: bundle.description
    }));

    return res.json({
      success: true,
      message: 'Data bundles fetched successfully',
      data: transformedBundles,
      biller_code: biller_code,
      count: transformedBundles.length
    });

  } catch (error) {
    console.error('❌ Error fetching data bundles:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch data bundles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get airtime products for a specific biller using Flutterwave bill-categories API
 * Endpoint: GET /api/flutterwave-direct/airtime/:biller_code
 */
const getAirtimeProducts = async (req, res) => {
  const { biller_code } = req.params;

  if (!biller_code) {
    return res.status(400).json({ 
      success: false,
      message: 'Biller code is required' 
    });
  }

  try {
    console.log('🔍 Fetching airtime products for biller:', biller_code);

    // Use Flutterwave bill-categories API directly
    const response = await axios.get(
      `${baseURL}/bill-categories?biller_code=${biller_code}`,
      { headers: headers }
    );

    console.log('✅ Airtime products fetched successfully:', {
      biller_code,
      productsCount: response.data.data?.length || 0
    });

    // Filter for airtime products only (is_airtime = true)
    const airtimeProducts = response.data.data?.filter(item => {
      return item.is_airtime === true;
    }) || [];

    // Transform data for frontend
    const transformedProducts = airtimeProducts.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      amount: product.amount,
      currency: product.currency,
      is_airtime: product.is_airtime,
      biller_code: product.biller_code,
      description: product.description
    }));

    return res.json({
      success: true,
      message: 'Airtime products fetched successfully',
      data: transformedProducts,
      biller_code: biller_code,
      count: transformedProducts.length
    });

  } catch (error) {
    console.error('❌ Error fetching airtime products:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch airtime products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all products (both data and airtime) for a specific biller
 * Endpoint: GET /api/flutterwave-direct/products/:biller_code
 */
const getAllProducts = async (req, res) => {
  const { biller_code } = req.params;

  if (!biller_code) {
    return res.status(400).json({ 
      success: false,
      message: 'Biller code is required' 
    });
  }

  try {
    console.log('🔍 Fetching all products for biller:', biller_code);

    // Use Flutterwave bill-categories API directly
    const response = await axios.get(
      `${baseURL}/bill-categories?biller_code=${biller_code}`,
      { headers: headers }
    );

    console.log('✅ All products fetched successfully:', {
      biller_code,
      productsCount: response.data.data?.length || 0
    });

    // Transform data for frontend
    const transformedProducts = response.data.data?.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      amount: product.amount,
      currency: product.currency,
      is_airtime: product.is_airtime,
      biller_code: product.biller_code,
      description: product.description,
      type: product.is_airtime ? 'airtime' : 'data'
    })) || [];

    // Separate into airtime and data
    const airtimeProducts = transformedProducts.filter(p => p.is_airtime);
    const dataProducts = transformedProducts.filter(p => !p.is_airtime);

    return res.json({
      success: true,
      message: 'All products fetched successfully',
      data: {
        all: transformedProducts,
        airtime: airtimeProducts,
        data: dataProducts
      },
      biller_code: biller_code,
      counts: {
        total: transformedProducts.length,
        airtime: airtimeProducts.length,
        data: dataProducts.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching all products:', error.response?.data || error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get telecom providers list
 * Endpoint: GET /api/flutterwave-direct/telecom-providers
 */
const getTelecomProviders = async (req, res) => {
  try {
    console.log('🔍 Fetching telecom providers...');

    // Return predefined telecom providers (both data and airtime)
    const dataProviders = Object.entries(TELECOM_PROVIDERS).map(([name, code]) => ({
      name: name,
      biller_code: code,
      display_name: name === '9MOBILE' ? '9mobile' : name,
      type: 'data'
    }));
    
    const airtimeProviders = Object.entries(AIRTIME_PROVIDERS).map(([name, code]) => ({
      name: name,
      biller_code: code,
      display_name: name === '9MOBILE' ? '9mobile' : name,
      type: 'airtime'
    }));
    
    const providers = [...dataProviders, ...airtimeProviders];

    console.log('✅ Telecom providers fetched successfully:', {
      providersCount: providers.length
    });

    return res.json({
      success: true,
      message: 'Telecom providers fetched successfully',
      data: providers,
      count: providers.length
    });

  } catch (error) {
    console.error('❌ Error fetching telecom providers:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch telecom providers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Process bill payment
 * Endpoint: POST /api/flutterwave-direct/pay
 */
const processBillPayment = async (req, res) => {
  const { 
    biller_code, 
    item_code, 
    amount, 
    phone_number, 
    tx_ref,
    user_id
  } = req.body;
  
  const userId = user_id || req.user?.id;

  if (!biller_code || !item_code || !amount || !phone_number || !tx_ref || !userId) {
    return res.status(400).json({ 
      success: false,
      message: 'Missing required fields: biller_code, item_code, amount, phone_number, tx_ref, user_id' 
    });
  }

  try {
    console.log('🚀 Processing bill payment:', {
      biller_code,
      item_code,
      amount,
      phone_number,
      tx_ref,
      userId
    });

    // 1. Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 2. Create transaction record
    const transaction = new Transaction({
      tx_ref,
      userId,
      phone: phone_number,
      biller_code,
      item_code,
      fullAmount: amount,
      userAmount: amount,
      status: 'processing',
      payment_type: 'bill_payment'
    });

    await transaction.save();
    console.log('💾 Transaction saved:', tx_ref);

    // 3. Call Flutterwave to complete the bill payment
    const paymentPayload = {
      country: 'NG',
      customer: phone_number,
      amount: amount,
      type: 'airtime', // or 'data' based on item type
      reference: tx_ref,
      biller_code: biller_code,
      meta: {
        userId,
        phone_number,
        biller_code,
        item_code,
        payment_type: 'bill_payment'
      }
    };

    console.log('🔗 Calling Flutterwave bill payment API...');
    const paymentResponse = await axios.post(
      `${baseURL}/bills`,
      paymentPayload,
      { headers: headers }
    );

    console.log('✅ Flutterwave bill payment response:', {
      status: paymentResponse.data.status,
      biller_reference: paymentResponse.data.data?.biller_reference
    });

    // 4. Update transaction status
    transaction.status = 'completed';
    transaction.biller_reference = paymentResponse.data.data?.biller_reference;
    transaction.biller_status = paymentResponse.data.data?.status;
    transaction.deliveredAt = new Date();
    await transaction.save();

    return res.json({
      success: true,
      message: 'Bill payment successful',
      data: {
        tx_ref,
        biller_reference: paymentResponse.data.data?.biller_reference,
        status: paymentResponse.data.data?.status,
        amount: amount,
        phone_number
      }
    });

  } catch (error) {
    console.error('❌ Error processing bill payment:', error.response?.data || error.message);
    
    // Update transaction status to failed
    try {
      const transaction = await Transaction.findOne({ tx_ref });
      if (transaction) {
        transaction.status = 'failed';
        transaction.error_message = error.message;
        await transaction.save();
      }
    } catch (updateError) {
      console.error('❌ Error updating transaction status:', updateError.message);
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Bill payment failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getDataBundles,
  getAirtimeProducts,
  getAllProducts,
  getTelecomProviders,
  processBillPayment
};
