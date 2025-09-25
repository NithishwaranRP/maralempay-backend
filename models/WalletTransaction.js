const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['deposit', 'withdrawal', 'airtime_purchase', 'data_purchase', 'referral_reward', 'subscription_discount', 'refund'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  metadata: {
    transactionId: String,
    flutterwaveReference: String,
    phoneNumber: String,
    network: String,
    dataPlan: String,
    originalAmount: Number,
    discountAmount: Number
  }
}, {
  timestamps: true
});

// Index for better query performance
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ reference: 1 });
walletTransactionSchema.index({ category: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
