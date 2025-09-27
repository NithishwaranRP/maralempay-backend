# 🔔 Flutterwave Webhook Setup Guide

## Overview
This guide explains how to configure Flutterwave webhooks to automatically update transaction statuses in your MaralemPay application.

## 🎯 Problem Solved
Previously, transactions were stuck with `"initialized"` status because there was no webhook listener to update them when payments completed. This guide fixes that issue.

## 📋 Prerequisites
- Flutterwave account with API keys
- Backend deployed and accessible
- Environment variables configured

## 🔧 Backend Configuration

### 1. Environment Variables
Ensure these are set in your production environment:

```bash
# Flutterwave Configuration
FLW_SECRET_KEY=FLWSECK-d6b4ee5933c0fb806a383d8c8475ed90-19985cff6a6vt-X
FLW_PUBLIC_KEY=FLWPUBK-7f96c7d7bccb0b1976a07ff82fd983ca-X
FLW_ENCRYPTION_KEY=d6b4ee5933c00335ed2a4c88
FLW_SECRET_HASH=your-webhook-secret-hash

# Backend Configuration
BACKEND_URL=https://maralempay-backend.onrender.com
```

### 2. Webhook Endpoint
The webhook endpoint is already implemented at:
```
POST https://maralempay-backend.onrender.com/api/webhook/flutterwave
```

### 3. Transaction Verification Endpoint
Manual verification endpoint (fallback):
```
GET https://maralempay-backend.onrender.com/api/webhook/verify/{tx_ref}
```

## 🔔 Flutterwave Dashboard Configuration

### Step 1: Access Flutterwave Dashboard
1. Login to your Flutterwave dashboard
2. Go to **Settings** → **Webhooks**

### Step 2: Configure Webhook URL
1. Click **"Add Webhook"**
2. Set the webhook URL to:
   ```
   https://maralempay-backend.onrender.com/api/webhook/flutterwave
   ```

### Step 3: Select Events
Enable these events:
- ✅ `charge.completed` - When payment is successful
- ✅ `charge.failed` - When payment fails

### Step 4: Set Secret Hash
1. Generate a secret hash (e.g., `maralempay_webhook_secret_2024`)
2. Set it in your environment variable: `FLW_SECRET_HASH=maralempay_webhook_secret_2024`
3. Enter the same hash in Flutterwave dashboard

### Step 5: Test Webhook
1. Click **"Test Webhook"** in Flutterwave dashboard
2. Check your backend logs for webhook events

## 🧪 Testing the System

### 1. Run Webhook Test Script
```bash
cd backend
node test_webhook_system.js
```

### 2. Test with Sample Transaction
```bash
# Create a test transaction
curl -X POST https://maralempay-backend.onrender.com/api/wallet/fund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

### 3. Verify Transaction Status
```bash
# Check transaction status
curl -X GET https://maralempay-backend.onrender.com/api/webhook/verify/TX_REF_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔄 How It Works

### 1. Payment Initiation
- User initiates payment (wallet funding, subscription, etc.)
- Transaction created with status `"initialized"`
- Flutterwave payment link generated

### 2. Payment Processing
- User completes payment on Flutterwave
- Flutterwave sends webhook to your backend
- Webhook verifies signature and updates transaction

### 3. Status Updates
- **Successful Payment**: Status → `"successful"`
  - Wallet funding: User balance increased
  - Subscription: User subscription activated
- **Failed Payment**: Status → `"failed"`

### 4. Fallback Verification
- If webhook fails, frontend can manually verify
- Uses Flutterwave API to check transaction status
- Updates database with correct status

## 🚨 Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events
**Symptoms**: Transactions stuck at `"initialized"`
**Solutions**:
- Check webhook URL is correct
- Verify `FLW_SECRET_HASH` matches Flutterwave dashboard
- Check server logs for webhook errors
- Test webhook endpoint manually

#### 2. Invalid Signature Error
**Symptoms**: `Invalid webhook signature` in logs
**Solutions**:
- Ensure `FLW_SECRET_HASH` is set correctly
- Verify hash matches Flutterwave dashboard
- Check webhook payload format

#### 3. Transaction Not Found
**Symptoms**: `Transaction not found for tx_ref` in logs
**Solutions**:
- Check transaction exists in database
- Verify `tx_ref` format matches
- Check transaction creation process

### Debug Commands

#### Check Stuck Transactions
```bash
node test_webhook_system.js
```

#### Manual Transaction Update
```javascript
// In MongoDB shell or script
db.transactions.updateOne(
  { tx_ref: "YOUR_TX_REF" },
  { 
    $set: { 
      status: "successful",
      flw_ref: "FLW_REF_HERE",
      updatedAt: new Date()
    }
  }
)
```

## 📊 Monitoring

### 1. Log Monitoring
Watch for these log messages:
- `🔔 Webhook received:` - Webhook event received
- `✅ Transaction verified:` - Successful verification
- `❌ Invalid webhook signature` - Signature verification failed
- `⚠️ Transaction not found` - Transaction lookup failed

### 2. Database Monitoring
Monitor these collections:
- `transactions` - Payment transactions
- `wallettransactions` - Wallet operations
- `users` - User wallet balances and subscriptions

### 3. Health Checks
Regular checks:
- Webhook endpoint accessibility
- Environment variables
- Database connectivity
- Flutterwave API status

## 🎉 Success Indicators

Your webhook system is working correctly when:
- ✅ Transactions update from `"initialized"` to `"successful"`/`"failed"`
- ✅ Wallet balances update after funding
- ✅ Subscriptions activate after payment
- ✅ No stuck transactions in database
- ✅ Webhook events logged in server

## 📞 Support

If you encounter issues:
1. Check server logs for error messages
2. Run the test script: `node test_webhook_system.js`
3. Verify Flutterwave dashboard webhook configuration
4. Test webhook endpoint manually with sample payload

---

**Last Updated**: September 27, 2025
**Version**: 1.0
**Status**: ✅ Production Ready
