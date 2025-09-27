# 🔔 Flutterwave Webhook Setup Guide

## ✅ **Problem Solved: Transaction Status Updates**

The issue where transactions were stuck with `"initialized"` status has been **completely resolved** with the implementation of:

1. **Flutterwave Webhook Listener** (`/api/webhook/flutterwave`)
2. **Transaction Verification Fallback** (`/api/webhook/verify/:tx_ref`)
3. **Automatic Status Updates** for all payment types

---

## 🚀 **What's Been Implemented**

### **1. Webhook Controller** (`controllers/webhookController.js`)
- ✅ **Signature Verification**: Validates Flutterwave webhook authenticity
- ✅ **Event Processing**: Handles `charge.completed` and `charge.failed` events
- ✅ **Status Updates**: Automatically updates transaction status to `successful` or `failed`
- ✅ **Wallet Balance Updates**: Credits user wallet on successful funding
- ✅ **Subscription Updates**: Activates user subscriptions on successful payment

### **2. Transaction Verification** (`/api/webhook/verify/:tx_ref`)
- ✅ **Manual Verification**: Fallback for when webhooks fail
- ✅ **Retry Logic**: Built-in retry mechanism with configurable attempts
- ✅ **Real-time Status**: Direct API call to Flutterwave for current status
- ✅ **User Data Updates**: Updates wallet balance and subscription status

### **3. Frontend Integration**
- ✅ **Transaction Verification Service**: Robust verification with retry logic
- ✅ **Wallet Provider Updates**: Enhanced wallet funding verification
- ✅ **Error Handling**: Comprehensive error handling and user feedback

---

## 🔧 **Environment Variables Required**

Add these to your `.env` file:

```env
# Flutterwave Configuration
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key
FLW_SECRET_HASH=your_webhook_secret_hash
FLW_BASE_URL=https://api.flutterwave.com/v3

# Backend Configuration
BASE_URL=https://your-backend-domain.com
MONGODB_URI=your_mongodb_connection_string
```

---

## 🌐 **Flutterwave Dashboard Configuration**

### **Step 1: Set Webhook URL**
1. Login to your Flutterwave Dashboard
2. Go to **Settings** → **Webhooks**
3. Add webhook URL: `https://your-backend-domain.com/api/webhook/flutterwave`
4. Select events: `charge.completed` and `charge.failed`

### **Step 2: Get Secret Hash**
1. In the webhook settings, copy the **Secret Hash**
2. Add it to your `.env` file as `FLW_SECRET_HASH`

---

## 🧪 **Testing the System**

### **Test 1: Check Current Status**
```bash
cd backend
node test_webhook_system.js
```

### **Test 2: Manual Transaction Verification**
```bash
# Test with a transaction reference
curl -X GET "https://your-backend-domain.com/api/webhook/verify/YOUR_TX_REF" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Test 3: Simulate Webhook**
```bash
# Test webhook endpoint
curl -X POST "https://your-backend-domain.com/api/webhook/flutterwave" \
  -H "Content-Type: application/json" \
  -H "verif-hash: YOUR_SECRET_HASH" \
  -d '{
    "event": "charge.completed",
    "data": {
      "status": "successful",
      "tx_ref": "YOUR_TX_REF",
      "flw_ref": "FLW_REF_123",
      "amount": 1000,
      "customer": {
        "email": "test@example.com"
      }
    }
  }'
```

---

## 📊 **Transaction Flow**

### **Before (Broken)**
```
1. User initiates payment → Transaction created with "initialized" status
2. Payment completes → Status remains "initialized" ❌
3. User wallet not updated ❌
4. Subscription not activated ❌
```

### **After (Fixed)**
```
1. User initiates payment → Transaction created with "initialized" status
2. Payment completes → Flutterwave sends webhook ✅
3. Webhook processes → Status updated to "successful" ✅
4. Wallet balance updated ✅
5. Subscription activated ✅
6. Fallback verification available if webhook fails ✅
```

---

## 🔍 **Monitoring & Debugging**

### **Check Transaction Status**
```javascript
// In your database
db.transactions.find({ status: "initialized" }) // Should be empty after webhook setup
db.transactions.find({ status: "successful" })  // Should show completed transactions
```

### **Check Wallet Transactions**
```javascript
db.wallettransactions.find().sort({ createdAt: -1 }).limit(10)
```

### **Check User Balances**
```javascript
db.users.find({ walletBalance: { $gt: 0 } })
```

---

## 🚨 **Troubleshooting**

### **Issue: Webhooks not received**
- ✅ Check webhook URL is correct in Flutterwave dashboard
- ✅ Verify `FLW_SECRET_HASH` is set correctly
- ✅ Ensure webhook endpoint is accessible from internet
- ✅ Check server logs for webhook processing

### **Issue: Transactions still stuck**
- ✅ Run manual verification: `GET /api/webhook/verify/:tx_ref`
- ✅ Check if webhook signature verification is working
- ✅ Verify database connection and transaction updates

### **Issue: Wallet balance not updating**
- ✅ Check if transaction type is `WALLET_FUNDING`
- ✅ Verify user ID matches transaction user ID
- ✅ Check wallet transaction creation in logs

---

## 🎯 **Key Benefits**

1. **✅ Automatic Status Updates**: No more stuck "initialized" transactions
2. **✅ Real-time Wallet Updates**: Instant balance updates on successful payments
3. **✅ Subscription Activation**: Automatic subscription activation
4. **✅ Fallback Verification**: Manual verification if webhooks fail
5. **✅ Robust Error Handling**: Comprehensive error handling and logging
6. **✅ Security**: Webhook signature verification for security

---

## 📱 **Frontend Integration**

The frontend now includes:
- **Transaction Verification Service**: Automatic retry logic
- **Enhanced Wallet Provider**: Better error handling
- **Real-time Status Updates**: Immediate feedback to users

---

## 🎉 **Result**

Your payment system now works correctly:
- ✅ Transactions update from "initialized" to "successful"/"failed"
- ✅ Wallet balances update automatically
- ✅ Subscriptions activate properly
- ✅ Users get real-time payment confirmation
- ✅ Robust fallback system for reliability

**The app is now working in the correct way!** 🚀
