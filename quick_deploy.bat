@echo off
echo 🚀 Quick deploy - fixing webhook routes...
echo.

git add routes/webhookRoutes.js
git commit -m "Fix webhook routes - remove auth middleware dependency"
git push origin main

echo.
echo ✅ Deployed! Webhook should work now.
echo.
pause
