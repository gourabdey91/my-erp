#!/bin/bash

# AWS Frontend Deployment Script for MyERP
# This script deploys the React frontend to S3 and CloudFront

echo "🚀 Starting AWS Frontend Deployment for MyERP"
echo "=============================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Configuration
BUCKET_NAME="myerp-frontend-$(date +%s)"
REGION="ap-south-1"
BUILD_DIR="../build"

echo "📦 Configuration:"
echo "   Bucket: $BUCKET_NAME"
echo "   Region: $REGION"
echo "   Build Dir: $BUILD_DIR"

# Check if we're in the client directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the client directory"
    echo "   cd client && ./aws-deploy-frontend.sh"
    exit 1
fi

# Install dependencies and build
echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building React app..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build failed! No build directory found."
    exit 1
fi

echo "✅ Build completed successfully"

# Create S3 bucket
echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION

if [ $? -ne 0 ]; then
    echo "❌ Failed to create S3 bucket"
    exit 1
fi

# Configure bucket for static website hosting
echo "🌐 Configuring bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document error.html

# Set bucket policy for public read access
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# Upload files to S3
echo "📤 Uploading files to S3..."
aws s3 sync $BUILD_DIR s3://$BUCKET_NAME --delete

# Create CloudFront distribution
echo "☁️  Creating CloudFront distribution..."
cat > cloudfront-config.json << EOF
{
  "CallerReference": "myerp-$(date +%s)",
  "Comment": "MyERP Frontend Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "$BUCKET_NAME-origin",
        "DomainName": "$BUCKET_NAME.s3-website-$REGION.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "$BUCKET_NAME-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0
  },
  "Enabled": true,
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200"
      }
    ]
  }
}
EOF

DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --query 'Distribution.Id' --output text)
rm cloudfront-config.json

if [ "$DISTRIBUTION_ID" = "None" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ Failed to create CloudFront distribution"
    exit 1
fi

echo "✅ CloudFront distribution created: $DISTRIBUTION_ID"

# Get the distribution domain name
sleep 10  # Wait for distribution to be available
DOMAIN_NAME=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text)

echo ""
echo "🎉 FRONTEND DEPLOYMENT SUCCESSFUL!"
echo "================================="
echo "📊 Deployment Information:"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   S3 Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "   CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "   CloudFront URL: https://$DOMAIN_NAME"
echo ""
echo "⏰ Note: CloudFront distribution may take 15-20 minutes to fully deploy."
echo ""
echo "🎯 Next Steps:"
echo "1. Wait for CloudFront to deploy (check AWS Console)"
echo "2. Test your application at: https://$DOMAIN_NAME"
echo "3. Update DNS records if using custom domain"
echo "4. Configure HTTPS certificate if needed"
