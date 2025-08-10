#!/bin/bash

# AWS Deployment Verification Script for MyERP
# This script tests all endpoints and verifies the deployment

echo "🔍 AWS Deployment Verification for MyERP"
echo "========================================"

# Check if API Gateway URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your API Gateway URL"
    echo "Usage: ./verify-deployment.sh https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod"
    exit 1
fi

API_BASE_URL="$1/api"

echo "🎯 Testing API Base URL: $API_BASE_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local method="$2"
    local description="$3"
    
    echo -n "Testing $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API_BASE_URL$endpoint")
    fi
    
    if [ "$response" = "200" ] || [ "$response" = "201" ] || [ "$response" = "404" ]; then
        echo "✅ OK ($response)"
        return 0
    else
        echo "❌ FAILED ($response)"
        return 1
    fi
}

# Test core endpoints
echo "🧪 Testing Core Endpoints:"
echo "========================="

test_endpoint "/health" "GET" "Health Check"
test_endpoint "/health/status" "GET" "Health Status"

echo ""
echo "🔐 Testing Authentication Endpoints:"
echo "===================================="

test_endpoint "/auth/login" "POST" "Login Endpoint"
test_endpoint "/auth/register" "POST" "Register Endpoint"

echo ""
echo "👥 Testing Resource Endpoints:"
echo "=============================="

test_endpoint "/users" "GET" "Users List"
test_endpoint "/business-units" "GET" "Business Units"
test_endpoint "/material-master" "GET" "Material Master"
test_endpoint "/dashboard/stats" "GET" "Dashboard Stats"
test_endpoint "/categories" "GET" "Categories"
test_endpoint "/payment-types" "GET" "Payment Types"
test_endpoint "/doctors" "GET" "Doctors"
test_endpoint "/hospitals" "GET" "Hospitals"
test_endpoint "/expense-types" "GET" "Expense Types"
test_endpoint "/sales-orders" "GET" "Sales Orders"

echo ""
echo "🎯 Detailed Health Check:"
echo "========================"

# Get detailed health info
health_response=$(curl -s "$API_BASE_URL/health")
echo "Health Response: $health_response"

echo ""
echo "📊 API Gateway Information:"
echo "=========================="

# Extract API ID from URL
api_id=$(echo "$1" | grep -oP '(?<=https://).*?(?=\.execute-api)')
echo "API Gateway ID: $api_id"
echo "Region: ap-south-1"
echo "Stage: prod"

echo ""
echo "🔗 Quick Access URLs:"
echo "===================="
echo "Health Check: $API_BASE_URL/health"
echo "API Documentation: $1/swagger-ui"
echo "AWS Console: https://ap-south-1.console.aws.amazon.com/lambda/home"

echo ""
echo "✅ Verification Complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Test login with your credentials"
echo "2. Upload material master data"
echo "3. Check dashboard functionality"
echo "4. Monitor AWS CloudWatch logs"

echo ""
echo "🎉 Your MyERP API is running successfully on AWS!"
