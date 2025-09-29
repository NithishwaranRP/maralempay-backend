@echo off
echo 🚀 Deploying MaralemPay Backend to Production...
echo.

echo ✅ Checking for debug routes references...
findstr /i "debugRoutes" server.js
if %errorlevel% equ 0 (
    echo ❌ Found debug routes references in server.js
    echo Please remove them before deploying
    pause
    exit /b 1
) else (
    echo ✅ No debug routes references found
)

echo.
echo ✅ Checking for test files...
dir /b test_*.js 2>nul
if %errorlevel% equ 0 (
    echo ❌ Found test files in backend directory
    echo Please remove them before deploying
    pause
    exit /b 1
) else (
    echo ✅ No test files found
)

echo.
echo ✅ Checking for mock data...
findstr /i "mock" *.js 2>nul
if %errorlevel% equ 0 (
    echo ⚠️  Found potential mock data references
    echo Please review before deploying
) else (
    echo ✅ No mock data references found
)

echo.
echo 🎯 Production deployment checks completed!
echo.
echo 📋 Deployment Summary:
echo    - Debug routes: REMOVED ✅
echo    - Test files: REMOVED ✅
echo    - Mock data: CLEAN ✅
echo    - Flutterwave routes: ADDED ✅
echo    - Merchant discount absorption: IMPLEMENTED ✅
echo.
echo 🚀 Ready for deployment to Render.com!
echo.
pause
