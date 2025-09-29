# 🚀 MaralemPay Backend Deployment Guide

## ✅ Recent Fixes Applied

### 1. Flutterwave Routes Registration
- ✅ Added Flutterwave routes to `server.js`
- ✅ Registered `/api/flutterwave` endpoint
- ✅ Updated endpoints list

### 2. LIVE API Keys Configuration
- ✅ Mobile app updated to use LIVE keys
- ✅ Backend ready for LIVE keys deployment

## 🔧 Deployment Steps

### Step 1: Update Render.com Environment Variables

Go to [Render.com Dashboard](https://dashboard.render.com) and update these environment variables:

```
FLW_SECRET_KEY=your-flutterwave-secret-key-here
FLW_PUBLIC_KEY=your-flutterwave-public-key-here
FLW_ENCRYPTION_KEY=your-flutterwave-encryption-key-here
FLW_SECRET_HASH=your-webhook-secret-hash-here
NODE_ENV=production
```

**Note:** Replace the placeholder values with your actual Flutterwave LIVE API keys.

### Step 2: Deploy Backend
1. Go to your Render.com service
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete

### Step 3: Test Endpoints
Test these endpoints after deployment:
- `https://maralempay-backend.onrender.com/api/health`
- `https://maralempay-backend.onrender.com/api/flutterwave/categories`

### Step 4: Test Mobile App
1. Open mobile app
2. Go to Airtime section
3. Verify airtime products load
4. Test real airtime purchase

## 🎯 Expected Results

### After Deployment:
- ✅ No more 404 errors
- ✅ Airtime/data products load in mobile app
- ✅ Real airtime/data delivered to phone numbers
- ✅ Payments go to Flutterwave LIVE account

### Business Model:
- Customer pays discounted amount (e.g., ₦90)
- You pay full amount (₦100) to telecom provider
- You absorb discount (₦10) as business cost
- Customer receives full airtime value

## 🔒 Security Notes

- ✅ No secret keys committed to repository
- ✅ All sensitive data in environment variables
- ✅ GitHub push protection enabled
- ✅ Secure deployment process

## 📱 Mobile App Status

- ✅ Updated to LIVE Flutterwave keys
- ✅ `isLiveMode = true`
- ✅ `environment = "PRODUCTION"`
- ✅ Ready for real transactions

## 🆘 Troubleshooting

### If airtime products don't load:
1. Check backend deployment status
2. Verify environment variables are set
3. Test `/api/flutterwave/categories` endpoint
4. Check mobile app logs

### If payments fail:
1. Verify LIVE API keys are correct
2. Check Flutterwave dashboard
3. Verify webhook configuration
4. Check transaction logs

## 📞 Support

For issues:
1. Check deployment logs on Render.com
2. Check mobile app debug logs
3. Verify Flutterwave dashboard
4. Contact support if needed