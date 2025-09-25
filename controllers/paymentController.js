const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Initialize payment
const initializePayment = async (req, res) => {
  try {
    const { amount, email, reference } = req.body;
    const userId = req.user.id;
    
    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'payment',
      amount: amount,
      reference: reference,
      status: 'pending',
      description: 'Payment initialization'
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      data: {
        reference: reference,
        amount: amount,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment'
    });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    
    // Find transaction
    const transaction = await Transaction.findOne({ reference });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Mock verification - in real app, verify with payment provider
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    await transaction.save();
    
    res.json({
      success: true,
      data: {
        reference: reference,
        status: 'completed',
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const transaction = await Transaction.findOne({ reference });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        reference: reference,
        status: transaction.status,
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentStatus,
  getPaymentHistory
};
