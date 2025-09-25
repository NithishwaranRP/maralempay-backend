@echo off
echo Deploying to Render with correct server.js configuration...
cd backend
git add .
git commit -m "Fix Render deployment - ensure server.js is used with email routes"
git push origin main
echo Render deployment initiated with server.js configuration!
echo The /api/email/reset-password endpoint should now be available.
pause
