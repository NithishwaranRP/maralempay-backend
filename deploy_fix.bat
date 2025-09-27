@echo off
echo 🔧 Deploying webhook fix...
echo.

echo 📝 Adding changes...
git add routes/webhookRoutes.js controllers/webhookController.js

echo.
echo 💾 Committing fix...
git commit -m "Fix webhook routes - remove problematic verifyTransaction import"

echo.
echo 📤 Pushing to repository...
git push origin main

echo.
echo ✅ Fix deployed! The webhook system should now work.
echo.
pause