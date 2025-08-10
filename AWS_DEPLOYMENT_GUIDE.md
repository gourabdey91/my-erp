# AWS Deployment Guide for MyERP v1.0.0

## 🚀 Complete AWS Serverless Setup

### Step 1: AWS Account Setup (Free Tier)

1. **Create AWS Account**: https://aws.amazon.com/free/
2. **Choose Free Tier**: You get 12 months free + always free services
3. **Verify Account**: Complete email and phone verification

### Step 2: AWS CLI Configuration

```powershell
# Configure AWS CLI with your credentials
aws configure

# Enter your details:
AWS Access Key ID: [Your Access Key]
AWS Secret Access Key: [Your Secret Key]  
Default region name: ap-south-1
Default output format: json
```

**Get AWS Credentials:**
1. Go to AWS Console → IAM → Users → Create User
2. Attach policy: `PowerUserAccess`
3. Create Access Keys → Download CSV

### Step 3: Deploy Backend (Lambda + API Gateway)

```powershell
# Navigate to AWS backend
cd "e:\SS Agency\Development\my-erp\aws-backend"

# Deploy to AWS (takes 5-10 minutes)
npm run deploy

# Get your API endpoint
serverless info
```

### Step 4: Update Frontend Configuration

After backend deployment, update frontend API URL:

```javascript
// client/src/config/api.js
const API_BASE_URL = 'https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod';
```

### Step 5: Deploy Frontend (S3 + CloudFront)

```powershell
# Build frontend
cd "e:\SS Agency\Development\my-erp\client"
npm run build

# Deploy to S3 (manual for now)
# We'll create automated script next
```

### Step 6: Custom Domain (Optional)

1. **Buy Domain**: AWS Route 53 or any provider
2. **SSL Certificate**: AWS Certificate Manager (Free)
3. **CloudFront**: Automatic HTTPS and CDN

## 🎯 What You Get

### ✅ **Backend (Serverless)**
- **25+ Lambda Functions**: Individual API endpoints
- **API Gateway**: Professional REST API
- **Auto-scaling**: 0-10,000 requests seamlessly  
- **99.99% Uptime**: AWS SLA guarantee

### ✅ **Frontend (Static Hosting)**
- **S3 Static Site**: Lightning fast loading
- **CloudFront CDN**: Global distribution
- **HTTPS**: SSL certificates included

### ✅ **Database**
- **MongoDB Atlas**: Already configured
- **Production Database**: myerp-prod created

## 💰 Cost Breakdown (Monthly)

| Service | Free Tier | Paid (After Free) |
|---------|-----------|-------------------|
| Lambda | 1M requests | $0.20/1M requests |
| API Gateway | 1M requests | $3.50/1M requests |
| S3 Hosting | 5GB storage | $0.023/GB |
| CloudFront | 50GB transfer | $0.085/GB |
| **Total** | **$0/month** | **$3-15/month** |

## 🔧 Deployment Commands

```powershell
# Deploy backend
cd aws-backend
npm run deploy

# Deploy to dev environment  
npm run deploy:dev

# View logs
npm run logs health

# Remove deployment (if needed)
npm run remove

# Test locally
npm run offline
```

## 🎉 Post-Deployment Checklist

- [ ] **AWS CLI configured**: `aws configure` completed
- [ ] **Backend deployed**: All Lambda functions created
- [ ] **API Gateway URL**: Copied from deployment output
- [ ] **Frontend API URL updated**: In `client/src/config/api.js`
- [ ] **Frontend built and deployed**: To S3 bucket
- [ ] **Health check working**: `GET /api/health` returns OK
- [ ] **User authentication tested**: Login/register working
- [ ] **Material Master CRUD tested**: Upload/view/edit working
- [ ] **Dashboard loading properly**: All stats displaying
- [ ] **SSL certificate configured**: HTTPS enabled
- [ ] **Custom domain setup**: Optional but recommended

## 🚀 Deployment Scripts

**Quick Start Commands:**
```powershell
# 1. Deploy Backend
cd aws-backend
deploy.bat

# 2. Deploy Frontend  
cd client
aws-deploy-frontend.bat

# 3. Test Everything
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/api/health
```

## 🆘 Common Issues & Solutions

**Issue**: "Invalid credentials"  
**Fix**: Run `aws configure` again with correct keys from IAM console

**Issue**: "Region not supported"   
**Fix**: Change region to `ap-south-1` (Mumbai) or `us-east-1` in serverless.yml

**Issue**: "CORS errors in browser"  
**Fix**: Check API URL in `client/src/config/api.js` - ensure it matches your API Gateway URL

**Issue**: "MongoDB connection timeout"  
**Fix**: Whitelist IP `0.0.0.0/0` in MongoDB Atlas Network Access

**Issue**: "JWT token invalid"  
**Fix**: Ensure JWT_SECRET in `.env` is at least 32 characters long

**Issue**: "S3 bucket already exists"  
**Fix**: Choose a unique bucket name (bucket names are global)

**Issue**: "Lambda function timeout"  
**Fix**: Check MongoDB connection and increase timeout in serverless.yml

## 📊 Monitoring & Analytics

**AWS CloudWatch Dashboard:**
- **Lambda Functions**: Invocation count, duration, errors
- **API Gateway**: Request count, latency, error rates  
- **S3**: Storage usage, request metrics
- **MongoDB Atlas**: Database performance metrics

**Access Monitoring:**
1. AWS Console → CloudWatch → Dashboards
2. Lambda → Functions → Your functions → Monitoring
3. API Gateway → APIs → Your API → Monitoring

## 🔧 Maintenance & Updates

**Backend Updates:**
```powershell
cd aws-backend
# Edit your code
npm run deploy  # Deploys only changed functions
```

**Frontend Updates:**
```powershell
cd client
npm run build
aws s3 sync build/ s3://your-bucket-name --delete
```

**Database Maintenance:**
- MongoDB Atlas automatic backups (7 days retention in free tier)
- Manual backup script: `scripts/backup-manager.js`

## 🎯 Next Steps

1. **Custom Domain**: 
   - Buy domain from Route 53 or external provider
   - Configure SSL certificate in AWS Certificate Manager
   - Set up CloudFront distribution with custom domain

2. **Enhanced Security**:
   - Enable AWS WAF for API protection
   - Set up API rate limiting
   - Configure AWS Secrets Manager for sensitive data

3. **Monitoring & Alerts**:
   - Set up CloudWatch alarms for errors
   - Configure SNS notifications
   - Set up uptime monitoring

4. **Performance Optimization**:
   - Enable API Gateway caching
   - Configure Lambda provisioned concurrency
   - Optimize S3 CloudFront caching policies

## 🏆 Success! Your ERP is Live

**✅ Production URLs:**
- **Frontend**: `http://your-bucket-name.s3-website-ap-south-1.amazonaws.com`
- **Backend API**: `https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/api`
- **Health Check**: `https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/api/health`

**✅ What You've Achieved:**
- **Enterprise-grade infrastructure** on AWS
- **99.99% uptime** with automatic scaling
- **Global CDN** for fast loading worldwide  
- **Zero server maintenance** required
- **Cost-effective** hosting within free tier
- **Professional API** with proper documentation
- **Secure authentication** with JWT tokens
- **Scalable database** with MongoDB Atlas

**🎉 Congratulations!** Your MyERP application is now running on world-class AWS infrastructure. 

**Need Help?** Check AWS CloudWatch logs or contact your development team.

---

**MyERP v1.0.0** - Deployed on AWS Serverless Architecture 🚀
