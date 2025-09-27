# 🚀 Deploy Webhook System to Production

## 🚨 **Current Issue:**
The webhook endpoint `https://maralempay.com.ng/api/webhook/flutterwave` is returning 405 (Method Not Allowed) because the webhook system is not deployed to your production domain.

## ✅ **Solution Steps:**

### **1. Deploy Backend to maralempay.com.ng**
You need to deploy your backend (with the webhook system) to your production domain.

**Options:**
- **Option A**: Deploy to your hosting provider (Vercel, Netlify, etc.)
- **Option B**: Set up a server and deploy there
- **Option C**: Use a reverse proxy from your current Render deployment

### **2. Ensure Webhook Files Are Included**
Make sure these files are deployed:
- ✅ `controllers/webhookController.js`
- ✅ `routes/webhookRoutes.js`
- ✅ `utils/flutterwave.js` (with verifyTransaction method)

### **3. Environment Variables**
Set these in your production environment:
```env
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
BASE_URL=https://maralempay.com.ng
FLW_SECRET_KEY=your_live_secret_key
FLW_PUBLIC_KEY=your_live_public_key
FLW_ENCRYPTION_KEY=your_live_encryption_key
```

### **4. Test After Deployment**
```bash
# Test webhook endpoint
curl -X POST "https://maralempay.com.ng/api/webhook/flutterwave" \
  -H "Content-Type: application/json" \
  -H "verif-hash: 0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a" \
  -d '{"event": "charge.completed", "data": {"status": "successful", "tx_ref": "TEST_123"}}'
```

## 🎯 **Quick Fix Options:**

### **Option 1: Use Render for Webhooks (Temporary)**
Update your Flutterwave webhook URL to:
```
https://maralempay-backend.onrender.com/api/webhook/flutterwave
```

### **Option 2: Deploy to Production Domain**
Deploy your backend with webhook system to `maralempay.com.ng`

### **Option 3: Reverse Proxy Setup**
Set up a reverse proxy from `maralempay.com.ng` to `maralempay-backend.onrender.com`

## 📋 **Current Status:**
- ✅ Webhook system implemented
- ✅ Flutterwave dashboard configured
- ❌ Webhook endpoint not deployed to production domain
- ✅ Mobile app updated to use production domain

**Next step: Deploy the webhook system to your production domain!** 🚀
