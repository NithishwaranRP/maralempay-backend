const axios = require('axios');
const crypto = require('crypto');

class FlutterwaveService {
  constructor() {
    this.baseURL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';
    this.publicKey = process.env.FLW_PUBLIC_KEY;
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.encryptionKey = process.env.FLW_ENCRYPTION_KEY;
    
    // Validate required environment variables
    if (!this.secretKey) {
      console.error('❌ FlutterwaveService: FLW_SECRET_KEY is not set in environment variables');
      throw new Error('Flutterwave secret key is required');
    }
    
    if (!this.publicKey) {
      console.error('❌ FlutterwaveService: FLW_PUBLIC_KEY is not set in environment variables');
      throw new Error('Flutterwave public key is required');
    }
    
    console.log('✅ FlutterwaveService initialized with:', {
      baseURL: this.baseURL,
      hasSecretKey: !!this.secretKey,
      hasPublicKey: !!this.publicKey,
      hasEncryptionKey: !!this.encryptionKey,
      secretKeyPrefix: this.secretKey ? this.secretKey.substring(0, 10) + '...' : 'Not set'
    });
    
    this.headers = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Encrypt data for Flutterwave
  encryptData(data) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }






  // Initialize wallet funding payment
  async initializeWalletPayment(user, amount) {
    try {
      const txRef = `WALLET_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        redirect_url: `${process.env.FRONTEND_URL}/wallet/success`,
        customer: {
          email: user.email,
          phonenumber: user.phone,
          name: `${user.firstName} ${user.lastName}`
        },
        customizations: {
          title: 'MaralemPay Wallet Funding',
          description: 'Fund your wallet for discounted purchases',
          logo: 'https://maralempay.com/logo.png'
        },
        meta: {
          user_id: user.id,
          payment_type: 'wallet_funding'
        }
      };

      const response = await axios.post(
        `${this.baseURL}/payments`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        data: {
          link: response.data.data.link,
          tx_ref: txRef
        }
      };
    } catch (error) {
      console.error('Flutterwave wallet funding error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize wallet funding'
      };
    }
  }

  // Initialize subscription payment
  async initializeSubscriptionPayment(user) {
    try {
      const amount = process.env.SUBSCRIPTION_AMOUNT || 4500;
      const txRef = `SUB_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        tx_ref: txRef,
        amount: amount,
        currency: 'NGN',
        redirect_url: `${process.env.FRONTEND_URL}/subscription/success`,
        customer: {
          email: user.email,
          phonenumber: user.phone,
          name: `${user.firstName} ${user.lastName}`
        },
        customizations: {
          title: 'MaralemPay Subscription',
          description: '3-month subscription payment',
          logo: 'https://maralempay.com/logo.png'
        },
        meta: {
          user_id: user.id,
          payment_type: 'subscription'
        }
      };

      const response = await axios.post(
        `${this.baseURL}/payments`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        data: {
          link: response.data.data.link,
          tx_ref: txRef,
          amount: amount
        }
      };
    } catch (error) {
      console.error('Flutterwave subscription payment error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize subscription payment'
      };
    }
  }

  // Verify payment with Flutterwave
  async verifyPayment(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/transactions/${transactionId}/verify`,
        { headers: this.headers }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Flutterwave payment verification error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Payment verification failed'
      };
    }
  }

  // Buy airtime using Flutterwave Bills API
  async buyAirtime(customer, amount, network = 'MTN') {
    try {
      const reference = `AIR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        country: 'NG',
        customer: customer,
        amount: amount,
        recurrence: 'ONCE',
        type: 'AIRTIME',
        reference: reference,
        biller_name: network
      };

      const response = await axios.post(
        `${this.baseURL}/bills`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        data: {
          ...response.data.data,
          reference: reference,
          amount: amount,
          network: network
        }
      };
    } catch (error) {
      console.error('Flutterwave airtime purchase error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Airtime purchase failed'
      };
    }
  }

  // Buy data using Flutterwave Bills API
  async buyData(customer, amount, billerName = 'MTN') {
    try {
      const reference = `DATA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        country: 'NG',
        customer: customer,
        amount: amount,
        recurrence: 'ONCE',
        type: 'DATA',
        reference: reference,
        biller_name: billerName
      };

      const response = await axios.post(
        `${this.baseURL}/bills`,
        payload,
        { headers: this.headers }
      );

      return {
        success: true,
        data: {
          ...response.data.data,
          reference: reference,
          amount: amount,
          biller_name: billerName
        }
      };
    } catch (error) {
      console.error('Flutterwave data purchase error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Data purchase failed'
      };
    }
  }

  // Get available billers
  async getBillers() {
    try {
      const response = await axios.get(
        `${this.baseURL}/bill-categories`,
        { headers: this.headers }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Flutterwave get billers error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get billers'
      };
    }
  }

  // Get data plans for a network
  async getDataPlans(network) {
    try {
      const response = await axios.get(
        `${this.baseURL}/bills/categories`,
        { headers: this.headers }
      );

      // Filter data plans for the specific network
      const dataPlans = response.data.data.filter(plan => 
        plan.category_name.toLowerCase().includes(network.toLowerCase()) &&
        plan.category_name.toLowerCase().includes('data')
      );

      return {
        success: true,
        data: dataPlans
      };
    } catch (error) {
      console.error('Flutterwave data plans error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch data plans'
      };
    }
  }

  // Get network providers
  async getNetworkProviders() {
    try {
      const response = await axios.get(
        `${this.baseURL}/bills/categories`,
        { headers: this.headers }
      );

      const providers = response.data.data.filter(provider => 
        provider.category_name.toLowerCase().includes('airtime') ||
        provider.category_name.toLowerCase().includes('data')
      );

      return {
        success: true,
        data: providers
      };
    } catch (error) {
      console.error('Flutterwave providers error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch network providers'
      };
    }
  }

  // Initialize payment (for checkout)
  async initializePayment(paymentData) {
    try {
      console.log('🔍 Flutterwave: Initializing payment with data:', {
        tx_ref: paymentData.tx_ref,
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_email: paymentData.customer?.email
      });

      // Validate required fields before making API call
      const requiredFields = ['tx_ref', 'amount', 'currency', 'customer', 'customer.email'];
      const missingFields = requiredFields.filter(field => {
        const keys = field.split('.');
        let value = paymentData;
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            return true;
          }
        }
        return !value;
      });

      if (missingFields.length > 0) {
        console.error('❌ Flutterwave: Missing required fields:', missingFields);
        return {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error_code: 'MISSING_FIELDS'
        };
      }

      // Validate amount is a positive number
      if (typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
        console.error('❌ Flutterwave: Invalid amount:', paymentData.amount);
        return {
          success: false,
          message: 'Amount must be a positive number',
          error_code: 'INVALID_AMOUNT'
        };
      }

      // Validate currency
      if (!paymentData.currency || typeof paymentData.currency !== 'string') {
        console.error('❌ Flutterwave: Invalid currency:', paymentData.currency);
        return {
          success: false,
          message: 'Currency is required and must be a string',
          error_code: 'INVALID_CURRENCY'
        };
      }

      console.log('🔍 Flutterwave: Making API call to:', `${this.baseURL}/payments`);
      console.log('🔍 Flutterwave: Request headers:', {
        'Authorization': this.headers.Authorization ? 'Bearer [REDACTED]' : 'Not set',
        'Content-Type': this.headers['Content-Type']
      });

      const response = await axios.post(
        `${this.baseURL}/payments`,
        paymentData,
        { 
          headers: this.headers,
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('✅ Flutterwave: Payment initialized successfully:', {
        tx_ref: paymentData.tx_ref,
        flw_ref: response.data.data.flw_ref,
        link: response.data.data.link,
        status: response.data.status
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('❌ Flutterwave payment initialization error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        }
      });

      // Handle specific error types
      let errorMessage = 'Payment initialization failed';
      let errorCode = 'UNKNOWN_ERROR';

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || 'Bad request - Invalid payment data';
          errorCode = 'BAD_REQUEST';
        } else if (status === 401) {
          errorMessage = 'Unauthorized - Invalid API credentials';
          errorCode = 'UNAUTHORIZED';
        } else if (status === 403) {
          errorMessage = 'Forbidden - API access denied';
          errorCode = 'FORBIDDEN';
        } else if (status === 404) {
          errorMessage = 'API endpoint not found';
          errorCode = 'NOT_FOUND';
        } else if (status >= 500) {
          errorMessage = 'Flutterwave server error';
          errorCode = 'SERVER_ERROR';
        } else {
          errorMessage = data?.message || `HTTP ${status} error`;
          errorCode = `HTTP_${status}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from Flutterwave API';
        errorCode = 'NO_RESPONSE';
      } else if (error.code === 'ECONNABORTED') {
        // Request timeout
        errorMessage = 'Request timeout - Flutterwave API took too long to respond';
        errorCode = 'TIMEOUT';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        // Network/connection error
        errorMessage = 'Network error - Cannot connect to Flutterwave API';
        errorCode = 'NETWORK_ERROR';
      }

      return {
        success: false,
        message: errorMessage,
        error_code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          original_error: error.message,
          response_data: error.response?.data,
          status: error.response?.status
        } : undefined
      };
    }
  }

  // Verify payment transaction
  // ENHANCED: Better verification logging for automated charging flow
  async verifyPayment(txRef) {
    try {
      console.log('🔍 Flutterwave Payment Verification: Checking customer payment status for tx_ref:', txRef);

      const response = await axios.get(
        `${this.baseURL}/transactions/${txRef}/verify`,
        { 
          headers: this.headers,
          timeout: 15000 // 15 second timeout
        }
      );

      const transaction = response.data.data;
      
      console.log('📊 Flutterwave Payment Verification Result:', {
        tx_ref: txRef,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        customer_email: transaction.customer?.email,
        payment_type: transaction.payment_type,
        created_at: transaction.created_at
      });
      
      // Enhanced status checking
      const validSuccessStatuses = ['successful', 'success'];
      const validFailureStatuses = ['failed', 'cancelled', 'canceled'];
      const validPendingStatuses = ['pending', 'processing'];
      
      if (validSuccessStatuses.includes(transaction.status.toLowerCase())) {
        console.log('✅ Customer payment CONFIRMED - Safe to charge Flutterwave account');
      } else if (validFailureStatuses.includes(transaction.status.toLowerCase())) {
        console.log('❌ Customer payment FAILED - Do NOT charge Flutterwave account');
      } else if (validPendingStatuses.includes(transaction.status.toLowerCase())) {
        console.log('⏳ Customer payment PENDING - Wait before charging Flutterwave account');
      } else {
        console.log('⚠️ Customer payment status UNKNOWN:', transaction.status);
      }

      return {
        success: true,
        data: {
          ...transaction,
          verification_time: new Date().toISOString(),
          safe_to_proceed: validSuccessStatuses.includes(transaction.status.toLowerCase())
        }
      };
    } catch (error) {
      console.error('❌ Flutterwave payment verification error:', {
        tx_ref: txRef,
        error_message: error.message,
        error_code: error.response?.status,
        error_data: error.response?.data
      });
      
      let errorMessage = 'Payment verification failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Verification timeout - please try again';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Network connection error during verification';
      }
      
      return {
        success: false,
        message: errorMessage,
        error_details: {
          code: error.response?.status || error.code,
          safe_to_proceed: false // Never proceed if verification fails
        }
      };
    }
  }

  // Purchase bill using Bills API
  // ENHANCED: Better error handling and logging for automated charging
  async purchaseBill(billsData) {
    try {
      console.log('💳 Flutterwave Bills API: Charging Flutterwave account for bill:', {
        biller_code: billsData.biller_code || billsData.type,
        amount: billsData.amount,
        customer: billsData.customer || billsData.phone,
        reference: billsData.reference || billsData.tx_ref,
        country: billsData.country
      });

      // Ensure required fields are present
      const requiredFields = ['country', 'customer', 'amount', 'reference'];
      const missingFields = requiredFields.filter(field => !billsData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Prepare the bills API payload
      const payload = {
        country: billsData.country,
        customer: billsData.customer,
        amount: billsData.amount,
        type: billsData.type || billsData.biller_code,
        reference: billsData.reference,
        recurrence: billsData.recurrence || 'ONCE'
      };

      // Add optional fields if provided
      if (billsData.biller_name) payload.biller_name = billsData.biller_name;
      if (billsData.item_code) payload.item_code = billsData.item_code;

      console.log('🚀 Sending request to Flutterwave Bills API:', payload);

      const response = await axios.post(
        `${this.baseURL}/bills`,
        payload,
        { 
          headers: this.headers,
          timeout: 30000 // 30 second timeout
        }
      );

      const responseData = response.data;
      
      console.log('✅ Flutterwave Bills API Response:', {
        status: responseData.status,
        message: responseData.message,
        reference: payload.reference,
        amount_charged: payload.amount,
        network: payload.biller_name || 'N/A',
        customer: payload.customer
      });

      // Check if the response indicates success
      if (responseData.status === 'success' || responseData.status === 'pending') {
        console.log('🎉 Flutterwave account charged successfully for bill delivery');

      return {
        success: true,
          data: {
            ...responseData.data,
            flutterwave_charged: true,
            amount_charged: payload.amount,
            charge_reference: payload.reference,
            charge_time: new Date().toISOString()
          }
        };
      } else {
        console.log('❌ Flutterwave Bills API returned non-success status:', responseData.status);
        
        return {
          success: false,
          message: responseData.message || 'Bill purchase failed with unknown status',
          flutterwave_response: responseData
        };
      }
    } catch (error) {
      console.error('❌ Flutterwave Bills API Error - Account NOT charged:', {
        error_message: error.message,
        error_code: error.response?.status,
        error_data: error.response?.data,
        bills_data: billsData
      });
      
      // Provide detailed error information
      let errorMessage = 'Bill purchase failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - please try again';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Network connection error';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      return {
        success: false,
        message: errorMessage,
        error_details: {
          code: error.response?.status || error.code,
          flutterwave_charged: false,
          safe_to_refund: true
        }
      };
    }
  }

  // Purchase airtime specifically
  // ENHANCED: Better network mapping and error handling for automated charging
  async purchaseAirtime({ phone, amount, network, txRef }) {
    try {
      console.log('📱 Flutterwave Airtime Purchase: Preparing to charge Flutterwave account:', {
        network: network,
        amount: amount,
        phone: phone,
        reference: txRef
      });

      // Map network to biller ID (using actual Flutterwave biller IDs)
      const billerCodes = {
        'MTN': '1',        // MTN VTU
        'AIRTEL': '17147', // AIRTEL VTU
        'GLO': '17148',    // GLO VTU
        '9MOBILE': '17149', // 9MOBILE VTU
        'ETISALAT': '17149', // Alias for 9Mobile
        'GIONEE': '17148'   // Alias for Glo
      };

      const networkUpper = network.toUpperCase();
      const billerCode = billerCodes[networkUpper];
      
      if (!billerCode) {
        console.log('⚠️ Unknown network, defaulting to MTN:', networkUpper);
      }
      
      const finalBillerCode = billerCode || 'BIL108'; // Default to MTN
      
      // Validate phone number format
      const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
      if (cleanPhone.length < 10 || cleanPhone.length > 14) {
        throw new Error('Invalid phone number format');
      }
      
      // Validate amount
      if (amount < 50) {
        throw new Error('Minimum airtime amount is ₦50');
      }
      
      if (amount > 50000) {
        throw new Error('Maximum airtime amount is ₦50,000');
      }
      
      const billsData = {
        country: 'NG',
        customer: cleanPhone,
        amount: amount,
        type: finalBillerCode,
        reference: txRef,
        biller_name: network,
        recurrence: 'ONCE'
      };

      console.log('💳 Charging Flutterwave account for airtime delivery:', {
        network: network,
        biller_code: finalBillerCode,
        amount: amount,
        phone: cleanPhone,
        reference: txRef
      });

      const result = await this.purchaseBill(billsData);
      
      if (result.success) {
        console.log('✅ Flutterwave account charged - Airtime delivered:', {
          network: network,
          amount: amount,
          phone: cleanPhone,
          reference: txRef,
          biller_code: finalBillerCode
        });
        
        return {
          success: true,
          data: {
            ...result.data,
            network: network,
            phone: cleanPhone,
            amount: amount,
            biller_code: finalBillerCode,
            service_type: 'airtime'
          }
        };
      } else {
        console.log('❌ Flutterwave account NOT charged - Airtime delivery failed:', {
          network: network,
          amount: amount,
          phone: cleanPhone,
          reference: txRef,
          error: result.message
        });

      return result;
      }
    } catch (error) {
      console.error('❌ Flutterwave airtime purchase error:', {
        error_message: error.message,
        network: network,
        amount: amount,
        phone: phone,
        reference: txRef
      });
      
      return {
        success: false,
        message: 'Airtime purchase failed: ' + error.message,
        error_details: {
          flutterwave_charged: false,
          safe_to_refund: true
        }
      };
    }
  }

  // Get bill categories with optional type filter
  async getBillCategories(type = null) {
    try {
      console.log('🔍 Flutterwave: Fetching bill categories', type ? `for type: ${type}` : '');
      
      const url = type 
        ? `${this.baseURL}/bill-categories?type=${type}`
        : `${this.baseURL}/bill-categories`;
        
      const response = await axios.get(url, { headers: this.headers });

      console.log('✅ Flutterwave: Bill categories fetched successfully:', {
        count: response.data.data?.length || 0,
        type: type || 'all'
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('❌ Flutterwave bill categories error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch bill categories'
      };
    }
  }

  // Get bill items for a specific biller with retry and fallback logic
  async getBillItems(billerCode) {
      console.log('🔍 Flutterwave: Fetching bill items for biller:', billerCode);
    console.log('🔍 Using endpoint:', `${this.baseURL}/billers/${billerCode}/items`);
    console.log('🔍 Headers:', { 
      'Authorization': `Bearer ${this.secretKey?.substring(0, 10)}...`,
      'Content-Type': 'application/json'
    });

    // Method 1: Try /billers/{id}/items endpoint
    try {
      console.log('📡 Attempting Method 1: /billers/{id}/items');
      
      const response = await axios.get(
        `${this.baseURL}/billers/${billerCode}/items`,
        { 
          headers: this.headers,
          timeout: 10000 // 10 second timeout
        }
      );

      console.log('✅ Flutterwave: Bill items fetched successfully via Method 1:', {
        billerCode,
        count: response.data.data?.length || 0,
        endpoint: '/billers/{id}/items'
      });

      return {
        success: true,
        data: response.data.data,
        method: 'billers_items',
        endpoint: `/billers/${billerCode}/items`
      };
    } catch (error) {
      console.error('❌ Method 1 failed - /billers/{id}/items error:', {
        billerCode,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
        errorMessage: error.message,
        endpoint: `/billers/${billerCode}/items`
      });

      // Method 2: Fallback to /bills endpoint with biller_code
      try {
        console.log('📡 Attempting Method 2: /bills with biller_code');
        
        const billsResponse = await axios.get(
          `${this.baseURL}/bills`,
          { 
            headers: this.headers,
            params: {
              biller_code: billerCode
            },
            timeout: 10000
          }
        );

        console.log('✅ Flutterwave: Bill items fetched successfully via Method 2:', {
          billerCode,
          count: billsResponse.data.data?.length || 0,
          endpoint: '/bills'
        });

        return {
          success: true,
          data: billsResponse.data.data,
          method: 'bills_fallback',
          endpoint: '/bills'
        };
      } catch (billsError) {
        console.error('❌ Method 2 failed - /bills error:', {
          billerCode,
          status: billsError.response?.status,
          statusText: billsError.response?.statusText,
          errorData: billsError.response?.data,
          errorMessage: billsError.message,
          endpoint: '/bills'
        });

        // Method 3: Try /bill-categories endpoint to get available billers
        try {
          console.log('📡 Attempting Method 3: /bill-categories to find valid billers');
          
          const categoriesResponse = await axios.get(
            `${this.baseURL}/bill-categories`,
            { 
              headers: this.headers,
              timeout: 10000
            }
          );

          // Filter for telecom-related categories
          const telecomCategories = categoriesResponse.data.data?.filter(cat => 
            cat.name && (
              cat.name.toLowerCase().includes('mtn') ||
              cat.name.toLowerCase().includes('airtel') ||
              cat.name.toLowerCase().includes('glo') ||
              cat.name.toLowerCase().includes('9mobile') ||
              cat.name.toLowerCase().includes('etisalat') ||
              cat.name.toLowerCase().includes('vtu')
            )
          ) || [];

          console.log('📱 Found telecom categories:', telecomCategories.map(cat => ({
            id: cat.id,
            name: cat.name
          })));

          return {
            success: true,
            data: telecomCategories,
            method: 'categories_fallback',
            endpoint: '/bill-categories',
            message: 'Biller items not available, returning telecom categories instead'
          };
        } catch (categoriesError) {
          console.error('❌ Method 3 failed - /bill-categories error:', {
            billerCode,
            status: categoriesError.response?.status,
            statusText: categoriesError.response?.statusText,
            errorData: categoriesError.response?.data,
            errorMessage: categoriesError.message,
            endpoint: '/bill-categories'
          });

          // All methods failed - return comprehensive error
      return {
        success: false,
            message: `All methods failed for biller ${billerCode}`,
            errors: {
              method1: {
                endpoint: `/billers/${billerCode}/items`,
                error: error.response?.data || error.message,
                status: error.response?.status
              },
              method2: {
                endpoint: '/bills',
                error: billsError.response?.data || billsError.message,
                status: billsError.response?.status
              },
              method3: {
                endpoint: '/bill-categories',
                error: categoriesError.response?.data || categoriesError.message,
                status: categoriesError.response?.status
              }
            },
            suggestions: [
              'Verify biller ID is correct',
              'Check if biller has items available',
              'Ensure API keys are valid for current environment',
              'Try using /bills endpoint directly',
              'Check Flutterwave dashboard for available billers'
            ]
          };
        }
      }
    }
  }

  // Get billers for a category
  async getBillers(categoryId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/bill-categories/${categoryId}/billers`,
        { headers: this.headers }
      );

      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Flutterwave billers error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch billers'
      };
    }
  }

  // Get biller items (legacy method - use getBillItems instead)
  async getBillerItems(billerId) {
    console.log('⚠️ Using legacy getBillerItems method. Consider using getBillItems for better error handling.');
    return await this.getBillItems(billerId);
  }

  // Validate biller code and test multiple endpoints
  async validateBillerCode(billerCode) {
    console.log('🔍 Validating biller code:', billerCode);
    
    const results = {
      billerCode,
      validationResults: {},
      recommendations: []
    };

    // Test 1: Check if biller exists in categories
    try {
      const categoriesResponse = await axios.get(
        `${this.baseURL}/bill-categories`,
        { headers: this.headers }
      );

      const matchingCategories = categoriesResponse.data.data?.filter(cat => 
        cat.id == billerCode || 
        cat.name?.toLowerCase().includes(billerCode.toLowerCase())
      ) || [];

      results.validationResults.categories = {
        success: true,
        found: matchingCategories.length > 0,
        matches: matchingCategories
      };

      if (matchingCategories.length === 0) {
        results.recommendations.push('Biller code not found in categories. Try using category ID instead.');
      }
    } catch (error) {
      results.validationResults.categories = {
        success: false,
        error: error.response?.data || error.message
      };
    }

    // Test 2: Try to get biller items
    const itemsResult = await this.getBillItems(billerCode);
    results.validationResults.items = itemsResult;

    // Test 3: Check environment and keys
    results.validationResults.environment = {
      baseURL: this.baseURL,
      hasSecretKey: !!this.secretKey,
      keyPrefix: this.secretKey?.substring(0, 10) || 'N/A',
      isTestKey: this.secretKey?.includes('TEST') || false
    };

    // Generate recommendations
    if (!itemsResult.success) {
      results.recommendations.push('Biller items endpoint failed. Try using /bills endpoint instead.');
    }

    if (!this.secretKey) {
      results.recommendations.push('No secret key configured. Check environment variables.');
    }

    if (this.secretKey?.includes('TEST') && this.baseURL.includes('api.flutterwave.com')) {
      results.recommendations.push('Using test key with live API. Ensure key matches environment.');
    }

    return results;
  }

  // Get all available telecom billers
  async getAllTelecomBillers() {
    try {
      console.log('🔍 Fetching all telecom billers...');
      
      const response = await axios.get(
        `${this.baseURL}/bill-categories`,
        { headers: this.headers }
      );

      const telecomBillers = response.data.data?.filter(cat => 
        cat.name && (
          cat.name.toLowerCase().includes('mtn') ||
          cat.name.toLowerCase().includes('airtel') ||
          cat.name.toLowerCase().includes('glo') ||
          cat.name.toLowerCase().includes('9mobile') ||
          cat.name.toLowerCase().includes('etisalat') ||
          cat.name.toLowerCase().includes('vtu') ||
          cat.name.toLowerCase().includes('data') ||
          cat.name.toLowerCase().includes('airtime')
        )
      ) || [];

      console.log('📱 Found telecom billers:', telecomBillers.map(biller => ({
        id: biller.id,
        name: biller.name,
        biller_type: biller.biller_type
      })));

      return {
        success: true,
        data: telecomBillers,
        count: telecomBillers.length
      };
    } catch (error) {
      console.error('❌ Error fetching telecom billers:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch telecom billers'
      };
    }
  }
}

module.exports = {
  FlutterwaveService
};
