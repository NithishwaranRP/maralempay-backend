# 🚀 Production Webhook Setup (Using Your Domain)

## ✅ **Since You Have a Domain - No ngrok Needed!**

### **🔑 Your Generated Secret Hash:**
```
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **🌐 Your Webhook URL (Using Your Domain):**
```
https://your-domain.com/api/webhook/flutterwave
```

---

## 📋 **Step-by-Step Setup for Your Domain**

### **Step 1: Add Secret Hash to Environment**
Add this line to your `.env` file:
```env
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **Step 2: Update BASE_URL in Environment**
Add this to your `.env` file (replace with your actual domain):
```env
BASE_URL=https://your-domain.com
```

### **Step 3: Deploy Your Backend**
Deploy your backend with the webhook system to your domain.

### **Step 4: Configure Flutterwave Dashboard**
1. Login to your Flutterwave Dashboard
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Fill in the form:
   - **URL**: `https://your-domain.com/api/webhook/flutterwave`
   - **Secret Hash**: `0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a`
   - **Events**: Select `charge.completed` and `charge.failed`
5. Click **Save**

### **Step 5: Test the Webhook**
1. Make a test payment in your app
2. Check your backend logs for webhook processing
3. Verify transaction status updates in your database

---

## 🧪 **Testing Commands**

### **Test Webhook Endpoint**
```bash
curl -X POST "https://your-domain.com/api/webhook/flutterwave" \
  -H "Content-Type: application/json" \
  -H "verif-hash: 0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a" \
  -d '{
    "event": "charge.completed",
    "data": {
      "status": "successful",
      "tx_ref": "TEST_TX_REF_123",
      "flw_ref": "FLW_REF_123",
      "amount": 1000
    }
  }'
```

### **Check Transaction Status**
```bash
node test_webhook_system.js
```

---

## 🔍 **Environment Variables for Production**

Add these to your production `.env` file:
```env
# Flutterwave Configuration
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key
FLW_BASE_URL=https://api.flutterwave.com/v3

# Backend Configuration
BASE_URL=https://your-domain.com
MONGODB_URI=your_mongodb_connection_string
```

---

## 🎯 **Expected Results**

After setup, you should see:
- ✅ Webhook requests in your backend logs
- ✅ Transaction status updates from "initialized" to "successful"/"failed"
- ✅ Wallet balance updates on successful payments
- ✅ Subscription activation on successful payments

---

## 🚀 **Deployment Commands**

### **Deploy to Your Domain:**
```bash
# Commit your changes
git add .
git commit -m "Add webhook system for transaction status updates"

# Push to your repository
git push origin main

# Deploy to your hosting platform (Vercel, Render, etc.)
```

---

## 📱 **What This Fixes**

- **Before**: Transactions stuck with `"initialized"` status ❌
- **After**: Automatic status updates to `"successful"`/`"failed"` ✅
- **Bonus**: Wallet balances and subscriptions update automatically ✅

**Your webhook system is now ready for production!** 🚀
