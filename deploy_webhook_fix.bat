@echo off
echo 🚀 Deploying Webhook System Fix...
echo.

echo 📋 Changes being deployed:
echo ✅ Flutterwave Webhook Listener
echo ✅ Transaction Verification System  
echo ✅ Automatic Status Updates
echo ✅ Wallet Balance Updates
echo ✅ Subscription Activation
echo.

echo 🔧 Committing changes...
git add .
git commit -m "Fix transaction status updates with webhook system

- Add Flutterwave webhook listener for automatic status updates
- Implement transaction verification fallback system
- Fix wallet balance and subscription updates
- Add comprehensive error handling and logging
- Resolve stuck 'initialized' transaction status issue"

echo.
echo 📤 Pushing to repository...
git push origin main

echo.
echo ✅ Deployment completed!
echo.
echo 🔔 Next Steps:
echo 1. Set FLW_SECRET_HASH in your environment variables
echo 2. Configure webhook URL in Flutterwave dashboard
echo 3. Test with sample transactions
echo.
echo 📖 See WEBHOOK_SETUP_GUIDE.md for detailed setup instructions
echo.
pause
