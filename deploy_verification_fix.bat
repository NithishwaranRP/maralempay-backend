@echo off
echo 🔧 Deploying enhanced transaction verification...
echo.

git add routes/webhookRoutes.js
git commit -m "Enhance transaction verification - auto-process successful payments"
git push origin main

echo.
echo ✅ Fix deployed! Transaction verification will now auto-process payments.
echo.
echo 🎯 What this fixes:
echo - Transaction verification will automatically process successful payments
echo - Wallet balance will update when verification is called
echo - No more stuck "initialized" transactions
echo.
pause



