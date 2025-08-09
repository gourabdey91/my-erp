@echo off
REM Production Deployment Script for Windows - v1.0.0
REM Run this script to prepare for production deployment

echo 🚀 Starting production deployment preparation for v1.0.0...

REM Check Node.js installation
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo 📦 Installing server dependencies...
cd server
call npm ci
if errorlevel 1 (
    echo ❌ Error: Failed to install server dependencies
    pause
    exit /b 1
)

echo 📦 Installing client dependencies...
cd ..\client
call npm ci
if errorlevel 1 (
    echo ❌ Error: Failed to install client dependencies
    pause
    exit /b 1
)

echo 🔨 Building React frontend...
call npm run build
if errorlevel 1 (
    echo ❌ Error: Failed to build React frontend
    pause
    exit /b 1
)

cd ..

echo ✅ Production build completed successfully!
echo.
echo 📋 Next Steps:
echo 1. Deploy backend to Railway/Render
echo 2. Deploy frontend to Netlify
echo 3. Update environment variables with production URLs
echo 4. Test production deployment
echo.
echo 🔗 Deployment Services (Free Tier):
echo - Railway: https://railway.app (Backend - $5 monthly credit)
echo - Netlify: https://netlify.com (Frontend - Free)
echo - MongoDB Atlas: https://cloud.mongodb.com (Database - 512MB Free)
echo.
echo 📖 For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
pause
