#!/bin/bash

echo "🚀 Testing MyERP Production Deployment on Railway"
echo "================================================="

BASE_URL="https://my-erp-production.up.railway.app"

echo ""
echo "📊 Testing Health Endpoint..."
curl -s "$BASE_URL/health" | head -5

echo ""
echo "🏠 Testing Root Endpoint..."
curl -s "$BASE_URL/" | head -5

echo ""
echo "🔗 Testing API Root..."
curl -s "$BASE_URL/api" | head -5

echo ""
echo "🏢 Testing Business Units Endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/business-units")
echo "$response"

echo ""
echo "👤 Testing Users Endpoint..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/users")
echo "$response"

echo ""
echo "🔐 Testing Auth Login Endpoint (without credentials)..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json")
echo "$response"

echo ""
echo "================================================="
echo "✅ Test completed!"
echo ""
echo "Expected results:"
echo "- Health: HTTP 200 with { status: 'OK' }"
echo "- Root: HTTP 200 with app info"
echo "- API Root: HTTP 200 with API info"
echo "- Business Units: HTTP 200 with data (or HTTP 401 if auth required)"
echo "- Auth Login: HTTP 400/422 (missing credentials) or HTTP 500 if DB error"
echo ""
echo "If you see timeouts or 502 errors, MongoDB Atlas needs IP whitelisting!"
