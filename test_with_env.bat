@echo off
echo 🧪 Running subscription update test with MongoDB Atlas...

set MONGODB_URI=mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN

echo 📋 MongoDB URI set
echo 🔗 Connecting to MongoDB Atlas...

node test_subscription_update.js

echo.
echo ✅ Test completed!
pause
