@echo off
REM AWS Serverless Deployment Script for MyERP v1.0.0 (Windows)
REM This script automates the complete AWS deployment process

echo 🚀 Starting AWS Serverless Deployment for MyERP v1.0.0
echo =======================================================

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed. Please install it first.
    echo    Run: winget install Amazon.AWSCLI
    pause
    exit /b 1
)

REM Check if AWS is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not configured. Please run 'aws configure' first.
    pause
    exit /b 1
)

echo ✅ AWS CLI is configured

REM Check if we're in the right directory
if not exist "serverless.yml" (
    echo ❌ Please run this script from the aws-backend directory
    echo    cd aws-backend ^&^& deploy.bat
    pause
    exit /b 1
)

echo ✅ Found serverless.yml configuration

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Dependencies are ready

REM Deploy to AWS
echo 🚀 Deploying backend to AWS...
echo    This may take 5-10 minutes for the first deployment...

npm run deploy

if %errorlevel% equ 0 (
    echo.
    echo 🎉 DEPLOYMENT SUCCESSFUL!
    echo ==========================
    
    REM Get deployment info
    echo 📊 Deployment Information:
    npm run info
    
    echo.
    echo 🎯 Next Steps:
    echo 1. Copy the API Gateway URL from above
    echo 2. Update frontend config: client/src/config/api.js
    echo 3. Deploy frontend to S3
    echo 4. Test your endpoints!
    
) else (
    echo.
    echo ❌ DEPLOYMENT FAILED!
    echo ====================
    echo Check the error messages above and try again.
    echo Common fixes:
    echo - Check AWS credentials: aws configure
    echo - Check AWS permissions: IAM policies
    echo - Check region availability: serverless.yml
    pause
    exit /b 1
)

echo.
echo Press any key to continue...
pause >nul
