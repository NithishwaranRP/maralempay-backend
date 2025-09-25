# 🚀 Live Flutterwave Keys Deployment Instructions

## 🔑 **Updated Flutterwave Keys (LIVE MODE)**

The following keys have been updated to live mode for production use:

### **Flutterwave Live Keys:**
```bash
FLW_PUBLIC_KEY=FLWPUBK-a51b8c5280d88f1ca2ad0128446e41f0-X
FLW_SECRET_KEY=FLWSECK-9f925e18bd582228f07d2761987d4604-1993c829568vt-X
FLW_ENCRYPTION_KEY=9f925e18bd58357d1e2c1fc6
FLW_BASE_URL=https://api.flutterwave.com/v3
```

## 📋 **Environment Variables to Update in Vercel**

Go to your Vercel dashboard and update these environment variables:

1. **FLW_PUBLIC_KEY** = `FLWPUBK-a51b8c5280d88f1ca2ad0128446e41f0-X`
2. **FLW_SECRET_KEY** = `FLWSECK-9f925e18bd582228f07d2761987d4604-1993c829568vt-X`
3. **FLW_ENCRYPTION_KEY** = `9f925e18bd58357d1e2c1fc6`
4. **NODE_ENV** = `production`

## 🔧 **JWT Token Authentication Fixes**

The following fixes have been implemented in the Flutter app:

### **1. Enhanced Token Loading:**
- Added automatic token initialization on app startup
- Enhanced debugging for token loading/saving
- Better error handling for token operations

### **2. Improved Dio Interceptor:**
- Automatic token loading before each request
- Better error messages for 401 responses
- Clear token debugging information

### **3. Debug Logging:**
- Token availability status
- Request headers with authorization
- Detailed error messages for authentication failures

## 🧪 **Testing the Fix**

### **1. Login Flow:**
1. User logs in successfully
2. Token is saved to SharedPreferences
3. Token is loaded on app startup
4. Token is attached to all API requests

### **2. Bills API Flow:**
1. `GET /api/bills/categories?type=data` - Should work with token
2. `GET /api/bills/items/BIL108` - Should work with token
3. `POST /api/bills/airtime` - Should work with token

### **3. Debug Output:**
Look for these logs in the Flutter console:
```
🔍 Debug: ApiService - Token initialization: Token loaded
✅ Debug: ApiService - Token saved: eyJhbGciOiJIUzI1NiIs...
🔍 Debug: ApiService - Adding Authorization header for /bills/categories
```

## 🚨 **Important Notes**

### **Live Keys Warning:**
- These are LIVE Flutterwave keys
- Real money transactions will be processed
- Ensure you have completed KYC verification
- Test thoroughly before going live

### **Security:**
- Never commit .env files to version control
- Use environment variables in production
- Monitor Flutterwave dashboard for transactions
- Set up proper error tracking

## 📱 **Flutter App Changes**

The following files have been updated:
- `lib/services/api_service.dart` - Enhanced token handling
- `lib/config/app_config.dart` - Updated Flutterwave keys
- `lib/providers/bill_payment_provider.dart` - Fixed method signatures
- `lib/screens/airtime/airtime_screen_new.dart` - Fixed compilation errors
- `lib/screens/data/data_screen_new.dart` - Fixed compilation errors

## 🎯 **Next Steps**

1. **Update Vercel Environment Variables** with the live keys
2. **Deploy the backend** with updated environment variables
3. **Test the Flutter app** with the new token handling
4. **Verify bills API** calls work with authentication
5. **Test complete payment flow** with live Flutterwave keys

## 🔍 **Troubleshooting**

If you still get 401 errors:
1. Check if user is logged in
2. Verify token is being saved after login
3. Check Vercel environment variables are updated
4. Look for debug logs in Flutter console
5. Verify backend is using live keys

---

**Ready for deployment!** 🚀

