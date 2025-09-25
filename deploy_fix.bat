@echo off
echo Deploying validation error fix...
git add .
git commit -m "Fix transaction validation error - add missing required fields"
vercel --prod
echo Deployment complete!
pause
