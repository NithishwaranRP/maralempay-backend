const axios = require('axios');

// Get bills balance
const getBillsBalance = async (req, res) => {
  try {
    // This would integrate with a bills payment API
    // For now, return a mock response
    res.json({
      success: true,
      data: {
        balance: 10000,
        currency: 'NGN'
      }
    });
  } catch (error) {
    console.error('Get bills balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bills balance'
    });
  }
};

// Get bills providers
const getBillsProviders = async (req, res) => {
  try {
    // Mock data for bills providers
    const providers = [
      { id: 'mtn', name: 'MTN', category: 'airtime' },
      { id: 'airtel', name: 'Airtel', category: 'airtime' },
      { id: 'glo', name: 'Glo', category: 'airtime' },
      { id: '9mobile', name: '9mobile', category: 'airtime' }
    ];
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Get bills providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bills providers'
    });
  }
};

// Validate customer
const validateCustomer = async (req, res) => {
  try {
    const { customer, service_type } = req.body;
    
    // Mock validation response
    res.json({
      success: true,
      data: {
        customer: customer,
        name: 'John Doe',
        status: 'valid'
      }
    });
  } catch (error) {
    console.error('Validate customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate customer'
    });
  }
};

// Purchase bill
const purchaseBill = async (req, res) => {
  try {
    const { customer, service_type, amount, reference } = req.body;
    
    // Mock bill purchase
    res.json({
      success: true,
      data: {
        reference: reference,
        status: 'success',
        message: 'Bill purchased successfully'
      }
    });
  } catch (error) {
    console.error('Purchase bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase bill'
    });
  }
};

module.exports = {
  getBillsBalance,
  getBillsProviders,
  validateCustomer,
  purchaseBill
};
