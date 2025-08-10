#!/bin/bash

# AWS Serverless Deployment Script for MyERP v1.0.0
# This script automates the complete AWS deployment process

echo "🚀 Starting AWS Serverless Deployment for MyERP v1.0.0"
echo "======================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Download from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Check if we're in the right directory
if [ ! -f "serverless.yml" ]; then
    echo "❌ Please run this script from the aws-backend directory"
    echo "   cd aws-backend && ./deploy.sh"
    exit 1
fi

echo "✅ Found serverless.yml configuration"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies are ready"

# Deploy to AWS
echo "🚀 Deploying backend to AWS..."
echo "   This may take 5-10 minutes for the first deployment..."

npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "=========================="
    
    # Get deployment info
    echo "📊 Deployment Information:"
    npm run info
    
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Copy the API Gateway URL from above"
    echo "2. Update frontend config: client/src/config/api.js"
    echo "3. Deploy frontend to S3"
    echo "4. Test your endpoints!"
    
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "===================="
    echo "Check the error messages above and try again."
    echo "Common fixes:"
    echo "- Check AWS credentials: aws configure"
    echo "- Check AWS permissions: IAM policies"
    echo "- Check region availability: serverless.yml"
    exit 1
fi
