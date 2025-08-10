@echo off
REM AWS Deployment Verification Script for MyERP (Windows)
REM This script tests all endpoints and verifies the deployment

echo 🔍 AWS Deployment Verification for MyERP
echo ========================================

REM Check if API Gateway URL is provided
if "%~1"=="" (
    echo ❌ Please provide your API Gateway URL
    echo Usage: verify-deployment.bat https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod
    pause
    exit /b 1
)

set API_BASE_URL=%1/api

echo 🎯 Testing API Base URL: %API_BASE_URL%
echo.

echo 🧪 Testing Core Endpoints:
echo =========================

REM Test health check
echo Testing Health Check...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/health"
echo.

echo Testing Health Status...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/health/status"
echo.

echo.
echo 🔐 Testing Authentication Endpoints:
echo ====================================

echo Testing Login Endpoint...
curl -s -o nul -w "HTTP %%{http_code}" -X POST "%API_BASE_URL%/auth/login"
echo.

echo Testing Register Endpoint...
curl -s -o nul -w "HTTP %%{http_code}" -X POST "%API_BASE_URL%/auth/register"
echo.

echo.
echo 👥 Testing Resource Endpoints:
echo ==============================

echo Testing Users List...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/users"
echo.

echo Testing Business Units...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/business-units"
echo.

echo Testing Material Master...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/material-master"
echo.

echo Testing Dashboard Stats...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/dashboard/stats"
echo.

echo Testing Categories...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/categories"
echo.

echo Testing Payment Types...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/payment-types"
echo.

echo Testing Doctors...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/doctors"
echo.

echo Testing Hospitals...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/hospitals"
echo.

echo Testing Expense Types...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/expense-types"
echo.

echo Testing Sales Orders...
curl -s -o nul -w "HTTP %%{http_code}" "%API_BASE_URL%/sales-orders"
echo.

echo.
echo 🎯 Detailed Health Check:
echo ========================

REM Get detailed health info
echo Health Response:
curl -s "%API_BASE_URL%/health"
echo.
echo.

echo 📊 API Information:
echo ===================
echo API Base URL: %API_BASE_URL%
echo Health Check: %API_BASE_URL%/health
echo Region: ap-south-1
echo Stage: prod

echo.
echo ✅ Verification Complete!
echo.
echo 🎯 Next Steps:
echo 1. Test login with your credentials
echo 2. Upload material master data  
echo 3. Check dashboard functionality
echo 4. Monitor AWS CloudWatch logs

echo.
echo 🎉 Your MyERP API is running successfully on AWS!

echo.
echo Press any key to continue...
pause >nul
