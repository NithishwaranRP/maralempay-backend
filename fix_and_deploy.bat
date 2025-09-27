@echo off
echo 🔧 Fixing webhook controller and deploying...
echo.

echo 📝 Adding changes to git...
git add controllers/webhookController.js

echo.
echo 💾 Committing fix...
git commit -m "Fix webhook controller FlutterwaveService import"

echo.
echo 📤 Pushing to repository...
git push origin main

echo.
echo ✅ Fix deployed! The webhook system should now work correctly.
echo.
echo 🎯 Next steps:
echo 1. Wait for Render to redeploy (usually takes 2-3 minutes)
echo 2. Update Flutterwave webhook URL to: https://maralempay-backend.onrender.com/api/webhook/flutterwave
echo 3. Test with a real payment
echo.
pause
