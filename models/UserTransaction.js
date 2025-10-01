const mongoose = require('mongoose');

// User Transaction Schema for transaction history
const userTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['airtime', 'data', 'wallet_funding'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  originalAmount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  phoneNumber: {
    type: String,
    required: true
  },
  network: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  flutterwaveTransactionId: {
    type: String,
    index: true
  },
  flutterwaveReference: {
    type: String,
    index: true
  },
  processedAt: {
    type: Date
  },
  description: {
    type: String
  },
  billDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userTransactionSchema.index({ user: 1, createdAt: -1 });
userTransactionSchema.index({ type: 1, createdAt: -1 });
userTransactionSchema.index({ status: 1, createdAt: -1 });

// Method to get transaction summary
userTransactionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    originalAmount: this.originalAmount,
    discount: this.discount,
    discountPercentage: this.discountPercentage,
    phoneNumber: this.phoneNumber,
    network: this.network,
    status: this.status,
    flutterwaveTransactionId: this.flutterwaveTransactionId,
    flutterwaveReference: this.flutterwaveReference,
    processedAt: this.processedAt,
    description: this.description,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to get user transactions
userTransactionSchema.statics.getUserTransactions = function(userId, limit = 10, skip = 0) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('beneficiary', 'name phoneNumber network');
};

// Static method to get transactions by status
userTransactionSchema.statics.getTransactionsByStatus = function(status, limit = 50, skip = 0) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.models.UserTransaction || mongoose.model('UserTransaction', userTransactionSchema);
