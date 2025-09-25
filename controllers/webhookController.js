const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { FlutterwaveService } = require('../utils/flutterwave');

const flutterwaveService = new FlutterwaveService();

// Handle Flutterwave webhook
const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;
    
    console.log('🔔 Flutterwave webhook received:', event, data);
    
    if (event === 'charge.completed') {
      // Handle successful payment
      const { tx_ref, status, amount, id: transaction_id } = data;
      
      console.log('💳 Payment completed:', {
        tx_ref,
        status,
        amount,
        transaction_id
      });
      
      if (status === 'successful') {
        // Check if this is a subscription payment
        const subscription = await Subscription.findOne({ paymentReference: tx_ref });
        
        if (subscription) {
          // Handle subscription payment
          console.log('🎯 Subscription payment detected:', {
            subscription_id: subscription._id,
            user_id: subscription.user,
            tx_ref,
            amount
          });
          
          // Update subscription status
          subscription.status = 'active';
          subscription.paymentStatus = 'paid';
          subscription.paymentDetails = data;
          subscription.paidAt = new Date();
          await subscription.save();
          
          // Update user subscription status
          await User.findByIdAndUpdate(subscription.user, {
            isSubscribed: true,
            subscriptionDate: subscription.startDate,
            subscriptionExpiry: subscription.endDate
          });
          
          // Update transaction status
          await Transaction.findOneAndUpdate(
            { tx_ref: tx_ref },
            {
              status: 'paid', // Use correct status from enum
              flutterwave_transaction_id: data.id,
              biller_reference: tx_ref,
              updatedAt: new Date()
            }
          );
          
          console.log('✅ Subscription activated successfully:', {
            subscription_id: subscription._id,
            user_id: subscription.user,
            tx_ref,
            status: 'active'
          });
          
        } else {
          // Handle regular bill payment
          const transaction = await Transaction.findOneAndUpdate(
            { tx_ref: tx_ref },
            { 
              status: 'paid',
              flutterwave_transaction_id: transaction_id,
              biller_reference: tx_ref,
              updatedAt: new Date()
            },
            { new: true }
          );
          
          if (transaction) {
            console.log('✅ Transaction updated to paid:', {
              transaction_id: transaction._id,
              tx_ref,
              status: 'paid'
            });
            
            // Trigger bill delivery
            try {
              const billDeliveryResult = await flutterwaveService.purchaseBill({
                country: 'NG',
                customer: transaction.phoneNumber,
                amount: transaction.amount,
                recurrence: 'ONCE',
                type: transaction.billerCode,
                reference: tx_ref
              });
              
              if (billDeliveryResult.success) {
                // Update transaction to completed
                await Transaction.findByIdAndUpdate(transaction._id, {
                  status: 'completed',
                  billDeliveryData: billDeliveryResult.data,
                  completedAt: new Date()
                });
                
                console.log('🎉 Bill delivered successfully:', {
                  transaction_id: transaction._id,
                  tx_ref,
                  bill_delivery: billDeliveryResult.data
                });
              } else {
                // Mark as bill delivery failed
                await Transaction.findByIdAndUpdate(transaction._id, {
                  status: 'bill_failed',
                  billDeliveryError: billDeliveryResult.message
                });
                
                console.log('❌ Bill delivery failed:', {
                  transaction_id: transaction._id,
                  tx_ref,
                  error: billDeliveryResult.message
                });
              }
            } catch (billError) {
              console.error('❌ Bill delivery error:', billError);
              await Transaction.findByIdAndUpdate(transaction._id, {
                status: 'bill_failed',
                billDeliveryError: billError.message
              });
            }
          } else {
            console.log('⚠️ Transaction not found for tx_ref:', tx_ref);
          }
        }
      } else if (status === 'failed' || status === 'cancelled') {
        // Handle failed payments
        const subscription = await Subscription.findOne({ paymentReference: tx_ref });
        
        if (subscription) {
          // Update subscription status to failed
          subscription.status = 'cancelled';
          subscription.paymentStatus = 'failed';
          subscription.paymentDetails = data;
          await subscription.save();
          
          console.log('❌ Subscription payment failed:', {
            subscription_id: subscription._id,
            tx_ref,
            status
          });
        } else {
          // Update transaction to failed
          await Transaction.findOneAndUpdate(
            { txRef: tx_ref },
            { 
              status: 'failed',
              paymentData: data,
              failedAt: new Date()
            }
          );
          
          console.log('❌ Payment failed:', {
            tx_ref,
            status
          });
        }
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Handle generic payment webhook
const handlePaymentWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;
    
    console.log('Payment webhook received:', event, data);
    
    // Handle different payment events
    switch (event) {
      case 'payment.success':
        // Handle successful payment
        break;
      case 'payment.failed':
        // Handle failed payment
        break;
      default:
        console.log('Unknown webhook event:', event);
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Handle bill payment callback from Flutterwave
const handleBillPaymentCallback = async (req, res) => {
  try {
    const { event, data } = req.body;
    
    console.log('Bill payment webhook received:', event, data);
    
    if (event === 'charge.completed') {
      const { tx_ref, status, id } = data;
      
      // Find the transaction
      const transaction = await Transaction.findOne({ txRef: tx_ref });
      
      if (!transaction) {
        console.log('Transaction not found for tx_ref:', tx_ref);
        return res.status(404).json({ status: 'error', message: 'Transaction not found' });
      }
      
      if (status === 'successful') {
        // Update transaction status
        transaction.status = 'paid';
        transaction.paymentDetails = data;
        transaction.paidAt = new Date();
        await transaction.save();
        
        // Trigger bill delivery
        const billPaymentData = {
          country: 'NG',
          customer: transaction.phoneNumber,
          amount: transaction.originalAmount,
          type: transaction.billerCode,
          reference: transaction.txRef,
          biller_name: transaction.metadata?.biller_name || 'MTN'
        };
        
        const billResult = await flutterwaveService.purchaseBill(billPaymentData);
        
        if (billResult.success) {
          transaction.status = 'completed';
          transaction.billDetails = billResult.data;
          transaction.completedAt = new Date();
          await transaction.save();
          
          console.log('Bill payment completed successfully:', tx_ref);
        } else {
          transaction.status = 'bill_failed';
          transaction.billError = billResult.message;
          await transaction.save();
          
          console.log('Bill delivery failed:', tx_ref, billResult.message);
        }
      } else {
        // Payment failed
        transaction.status = 'failed';
        transaction.paymentDetails = data;
        await transaction.save();
        
        console.log('Bill payment failed:', tx_ref, status);
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Bill payment webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  handlePaymentWebhook,
  handleBillPaymentCallback
};
