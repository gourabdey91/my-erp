#!/bin/bash
# Production Deployment Script for v1.0.0
# Run this script to deploy to production

echo "🚀 Starting production deployment for v1.0.0..."

# Check if required environment variables are set
if [ -z "$MONGODB_URI" ]; then
    echo "❌ Error: MONGODB_URI environment variable is not set"
    echo "Please set your MongoDB Atlas connection string"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET environment variable is not set"
    echo "Please set a secure JWT secret key"
    exit 1
fi

# Set production environment
export NODE_ENV=production

echo "📦 Installing server dependencies..."
cd server
npm ci --only=production

echo "📦 Installing client dependencies..."
cd ../client
npm ci

echo "🔨 Building React frontend..."
npm run build

echo "🧪 Running basic health checks..."
cd ../server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Check if server is responding
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server health check passed"
else
    echo "❌ Server health check failed"
    kill $SERVER_PID
    exit 1
fi

# Stop test server
kill $SERVER_PID

echo "✅ Production build completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy backend to Railway/Render"
echo "2. Deploy frontend to Netlify"
echo "3. Update environment variables with production URLs"
echo "4. Test production deployment"
echo ""
echo "🔗 Deployment URLs to configure:"
echo "- Backend: https://your-app-name.railway.app"
echo "- Frontend: https://your-app-name.netlify.app"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
