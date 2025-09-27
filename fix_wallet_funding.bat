@echo off
echo 🔧 Fixing wallet funding transaction creation...
echo.

echo 📝 Adding changes...
git add controllers/walletController.js

echo.
echo 💾 Committing fix...
git commit -m "Fix wallet funding - create transaction record when initializing payment"

echo.
echo 📤 Pushing to repository...
git push origin main

echo.
echo ✅ Fix deployed! Wallet funding will now create transaction records.
echo.
echo 🎯 What this fixes:
echo - Transaction records are created when wallet funding is initiated
echo - Webhook can now find and update the transaction
echo - Wallet balance will update automatically after payment
echo.
pause
