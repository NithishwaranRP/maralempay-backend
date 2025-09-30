const axios = require('axios');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class BillController {
  constructor() {
    this.baseURL = 'https://api.flutterwave.com/v3';
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.publicKey = process.env.FLW_PUBLIC_KEY;
    
    if (!this.secretKey) {
      throw new Error('FLW_SECRET_KEY environment variable is required');
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 1. Fetches specific products/items for a given Biller (e.g., MTN Data Bundles)
   * Endpoint: GET /api/bills/products/:biller_id
   */
  async getBillerProducts(req, res) {
    const { biller_id } = req.params;

    if (!biller_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Biller ID is required' 
      });
    }

    try {
      console.log('🔍 Fetching products for biller:', biller_id);

      // Call Flutterwave API to get biller items/products
      const response = await axios.get(
        `${this.baseURL}/billers/${biller_id}/items`,
        { headers: this.headers }
      );

      console.log('✅ Biller products fetched successfully:', {
        biller_id,
        productsCount: response.data.data?.length || 0
      });

      // Transform data for frontend
      const products = response.data.data?.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        is_airtime: item.is_airtime,
        category: item.category,
        description: item.description
      })) || [];

      return res.json({
        success: true,
        message: 'Biller products fetched successfully',
        data: products,
        biller_id: biller_id
      });

    } catch (error) {
      console.error('❌ Error fetching biller products:', error.response?.data || error.message);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch biller products',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 2. Processes the payment for a bill item (Airtime or Data)
   * Endpoint: POST /api/bills/pay
   */
  async processBillPayment(req, res) {
    const { 
      biller_id, 
      item_code, 
      amount, 
      phone_number, 
      tx_ref,
      user_id
    } = req.body;
    
    // Auth middleware should have already provided user ID
    const userId = user_id || req.user?.id;

    if (!biller_id || !item_code || !amount || !phone_number || !tx_ref || !userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: biller_id, item_code, amount, phone_number, tx_ref, user_id' 
      });
    }

    try {
      console.log('🚀 Processing bill payment:', {
        biller_id,
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
        biller_code: biller_id,
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
        biller_code: biller_id,
        meta: {
          userId,
          phone_number,
          biller_id,
          item_code,
          payment_type: 'bill_payment'
        }
      };

      console.log('🔗 Calling Flutterwave bill payment API...');
      const paymentResponse = await axios.post(
        `${this.baseURL}/bills`,
        paymentPayload,
        { headers: this.headers }
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
  }

  /**
   * 3. Get biller details
   * Endpoint: GET /api/bills/billers/:biller_id
   */
  async getBillerDetails(req, res) {
    const { biller_id } = req.params;

    if (!biller_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Biller ID is required' 
      });
    }

    try {
      console.log('🔍 Fetching biller details:', biller_id);

      // Get all billers and find the specific one
      const response = await axios.get(
        `${this.baseURL}/billers`,
        { headers: this.headers }
      );

      const biller = response.data.data?.find(b => 
        b.biller_code === biller_id || b.id === biller_id
      );

      if (!biller) {
        return res.status(404).json({
          success: false,
          message: 'Biller not found'
        });
      }

      return res.json({
        success: true,
        message: 'Biller details fetched successfully',
        data: {
          id: biller.id,
          biller_code: biller.biller_code,
          name: biller.name,
          category: biller.category,
          country: biller.country,
          is_airtime: biller.is_airtime
        }
      });

    } catch (error) {
      console.error('❌ Error fetching biller details:', error.response?.data || error.message);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch biller details',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 4. Get billers by category
   * Endpoint: GET /api/bills/billers/category/:category
   */
  async getBillersByCategory(req, res) {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({ 
        success: false,
        message: 'Category is required' 
      });
    }

    try {
      console.log('🔍 Fetching billers for category:', category);

      // Get all billers and filter by category
      const response = await axios.get(
        `${this.baseURL}/billers`,
        { headers: this.headers }
      );

      let billers = response.data.data || [];

      // Filter for telecom providers if category is AIRTIME or MOBILEDATA
      if (category === 'AIRTIME' || category === 'MOBILEDATA') {
        billers = billers.filter(biller => {
          const name = (biller.name || '').toLowerCase();
          return name.includes('mtn') || name.includes('airtel') || 
                 name.includes('glo') || name.includes('9mobile') ||
                 name.includes('etisalat') || name.includes('visafone') ||
                 name.includes('smile') || name.includes('ntel');
        });
      } else {
        // Filter by category for other types
        billers = billers.filter(biller => 
          biller.category?.toLowerCase() === category.toLowerCase()
        );
      }

      // Transform data for frontend
      const transformedBillers = billers.map(biller => ({
        id: biller.id,
        biller_code: biller.biller_code,
        name: biller.name,
        category: biller.category,
        country: biller.country,
        is_airtime: biller.is_airtime
      }));

      return res.json({
        success: true,
        message: `Found ${transformedBillers.length} billers for category ${category}`,
        data: transformedBillers,
        category: category
      });

    } catch (error) {
      console.error('❌ Error fetching billers by category:', error.response?.data || error.message);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch billers by category',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new BillController();
