const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction reference
  txRef: {
    type: String,
    required: true,
    unique: true
  },
  
  // Bill payment details
  billerCode: {
    type: String,
    required: true
  },
  
  itemCode: {
    type: String,
    required: true
  },
  
  customerId: {
    type: String,
    required: true
  },
  
  productName: {
    type: String,
    required: true
  },
  
  productType: {
    type: String,
    required: true,
    enum: ['airtime', 'data']
  },
  
  // Pricing information
  fullPrice: {
    type: Number,
    required: true
  },
  
  customerAmount: {
    type: Number,
    required: true
  },
  
  discountAmount: {
    type: Number,
    required: true
  },
  
  discountPercentage: {
    type: Number,
    required: true,
    default: 10
  },
  
  // Transaction status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'fulfillment_failed'],
    default: 'pending'
  },
  
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  fulfillmentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Flutterwave transaction IDs
  flutterwaveTransactionId: {
    type: String
  },
  
  flutterwaveBillPaymentId: {
    type: String
  },
  
  // Timestamps
  paymentCompletedAt: {
    type: Date
  },
  
  fulfillmentCompletedAt: {
    type: Date
  },
  
  // Error handling
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ txRef: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ paymentStatus: 1 });
transactionSchema.index({ fulfillmentStatus: 1 });

// Virtual for transaction summary
transactionSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    txRef: this.txRef,
    productName: this.productName,
    customerId: this.customerId,
    fullPrice: this.fullPrice,
    customerAmount: this.customerAmount,
    discountAmount: this.discountAmount,
    status: this.status,
    createdAt: this.createdAt
  };
});

// Method to check if transaction is completed
transactionSchema.methods.isCompleted = function() {
  return this.status === 'completed' && 
         this.paymentStatus === 'completed' && 
         this.fulfillmentStatus === 'completed';
};

// Method to check if transaction failed
transactionSchema.methods.isFailed = function() {
  return this.status === 'failed' || 
         this.status === 'fulfillment_failed' ||
         this.paymentStatus === 'failed' ||
         this.fulfillmentStatus === 'failed';
};

// Method to get transaction status summary
transactionSchema.methods.getStatusSummary = function() {
  return {
    overall: this.status,
    payment: this.paymentStatus,
    fulfillment: this.fulfillmentStatus,
    isCompleted: this.isCompleted(),
    isFailed: this.isFailed(),
    errorMessage: this.errorMessage
  };
};

// Static method to get user's transaction statistics
transactionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        completedTransactions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedTransactions: {
          $sum: { $cond: [{ $in: ['$status', ['failed', 'fulfillment_failed']] }, 1, 0] }
        },
        totalAmountPaid: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$customerAmount', 0] }
        },
        totalDiscountReceived: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$discountAmount', 0] }
        },
        totalValueReceived: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$fullPrice', 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalTransactions: 0,
    completedTransactions: 0,
    failedTransactions: 0,
    totalAmountPaid: 0,
    totalDiscountReceived: 0,
    totalValueReceived: 0
  };
};

// Ensure virtual fields are serialized
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);