Write-Host "🔧 Deploying wallet funding fix..." -ForegroundColor Green

Write-Host "📝 Adding changes..." -ForegroundColor Yellow
git add controllers/walletController.js

Write-Host "💾 Committing fix..." -ForegroundColor Yellow
git commit -m "Fix wallet funding - create transaction record when initializing payment"

Write-Host "📤 Pushing to repository..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ Fix deployed! Wallet funding will now create transaction records." -ForegroundColor Green
Write-Host ""
Write-Host "🎯 What this fixes:" -ForegroundColor Cyan
Write-Host "- Transaction records are created when wallet funding is initiated" -ForegroundColor White
Write-Host "- Webhook can now find and update the transaction" -ForegroundColor White
Write-Host "- Wallet balance will update automatically after payment" -ForegroundColor White
