@echo off
REM AWS Frontend Deployment Script for MyERP (Windows)
REM This script deploys the React frontend to S3 and CloudFront

echo 🚀 Starting AWS Frontend Deployment for MyERP
echo ==============================================

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not configured. Please run 'aws configure' first.
    pause
    exit /b 1
)

echo ✅ AWS CLI is configured

REM Configuration
set BUCKET_NAME=myerp-frontend-%random%
set REGION=ap-south-1
set BUILD_DIR=build

echo 📦 Configuration:
echo    Bucket: %BUCKET_NAME%
echo    Region: %REGION%
echo    Build Dir: %BUILD_DIR%

REM Check if we're in the client directory
if not exist "package.json" (
    echo ❌ Please run this script from the client directory
    echo    cd client ^&^& aws-deploy-frontend.bat
    pause
    exit /b 1
)

REM Install dependencies and build
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🏗️  Building React app...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

if not exist "%BUILD_DIR%" (
    echo ❌ Build failed! No build directory found.
    pause
    exit /b 1
)

echo ✅ Build completed successfully

REM Create S3 bucket
echo 🪣 Creating S3 bucket: %BUCKET_NAME%
aws s3 mb s3://%BUCKET_NAME% --region %REGION%
if %errorlevel% neq 0 (
    echo ❌ Failed to create S3 bucket
    pause
    exit /b 1
)

REM Configure bucket for static website hosting
echo 🌐 Configuring bucket for static website hosting...
aws s3 website s3://%BUCKET_NAME% --index-document index.html --error-document error.html

REM Create bucket policy for public read access
echo { > bucket-policy.json
echo   "Version": "2012-10-17", >> bucket-policy.json
echo   "Statement": [ >> bucket-policy.json
echo     { >> bucket-policy.json
echo       "Sid": "PublicReadGetObject", >> bucket-policy.json
echo       "Effect": "Allow", >> bucket-policy.json
echo       "Principal": "*", >> bucket-policy.json
echo       "Action": "s3:GetObject", >> bucket-policy.json
echo       "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" >> bucket-policy.json
echo     } >> bucket-policy.json
echo   ] >> bucket-policy.json
echo } >> bucket-policy.json

aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json
del bucket-policy.json

REM Upload files to S3
echo 📤 Uploading files to S3...
aws s3 sync %BUILD_DIR% s3://%BUCKET_NAME% --delete

REM Get S3 website URL
set S3_WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%REGION%.amazonaws.com

echo.
echo 🎉 FRONTEND DEPLOYMENT SUCCESSFUL!
echo =================================
echo 📊 Deployment Information:
echo    S3 Bucket: %BUCKET_NAME%
echo    S3 Website URL: %S3_WEBSITE_URL%
echo.
echo 🎯 Next Steps:
echo 1. Test your application at: %S3_WEBSITE_URL%
echo 2. For better performance, set up CloudFront distribution
echo 3. Configure custom domain if needed
echo 4. Update API configuration with backend URL

echo.
echo Press any key to continue...
pause >nul
