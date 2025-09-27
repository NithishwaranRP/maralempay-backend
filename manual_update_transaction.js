const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

async function updateTransaction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const txRef = 'WALLET_68d78cc5f6d21a2cb7ec8fa5_1758992031636_dsd9c6qjj';
    
    // Find and update the transaction
    const transaction = await Transaction.findOne({ tx_ref: txRef });
    
    if (transaction) {
      console.log('📊 Found transaction:', {
        tx_ref: transaction.tx_ref,
        status: transaction.status,
        amount: transaction.userAmount
      });
      
      // Update to successful
      transaction.status = 'successful';
      transaction.flw_ref = 'FLW_REF_9678436';
      transaction.updatedAt = new Date();
      await transaction.save();
      
      console.log('✅ Transaction updated to successful');
      
      // Update user wallet balance
      const User = require('./models/User');
      const user = await User.findById(transaction.userId);
      if (user) {
        user.walletBalance += transaction.userAmount;
        await user.save();
        console.log(`✅ Wallet balance updated: +₦${transaction.userAmount}`);
      }
      
    } else {
      console.log('❌ Transaction not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

updateTransaction();
