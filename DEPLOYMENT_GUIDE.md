# Production Deployment Guide - v1.0.0

## Overview
This guide covers deploying your ERP system to production using free-tier services, perfect for small businesses with limited data and budget.

## Architecture
- **Frontend**: React app deployed on Netlify (Free tier)
- **Backend**: Node.js API deployed on Railway/Render (Free tier)
- **Database**: MongoDB Atlas (Free tier - 512MB)
- **Domain**: Free subdomain or your own domain

## Free Tier Limits
- **Netlify**: 100GB bandwidth/month, 300 build minutes/month
- **Railway**: $5 credit monthly (sufficient for small apps)
- **Render**: 750 hours/month (covers 24/7 operation)
- **MongoDB Atlas**: 512MB storage, 3 users

## Step-by-Step Deployment

### 1. Database Setup (MongoDB Atlas - FREE)
- ✅ Already configured in your app
- Your connection string: `mongodb+srv://...`
- Free tier: 512MB storage (sufficient for small business)
- Automatic backups included

### 2. Backend Deployment Options

#### Option A: Railway (Recommended - $5/month credit)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway project new
railway add --database mongodb
railway up
```

#### Option B: Render (Free - 750 hours/month)
```bash
# Connect GitHub repo to Render
# Auto-deploy from main branch
# Free tier includes SSL
```

### 3. Frontend Deployment (Netlify - FREE)
```bash
# Build production version
cd client
npm run build

# Deploy to Netlify
# Connect GitHub repo for auto-deploy
# Free SSL certificate included
```

### 4. Environment Configuration
- Set production environment variables
- Update API URLs to production endpoints
- Configure CORS for production domain

## Production Checklist
- [ ] Database: MongoDB Atlas (Free tier configured)
- [ ] Backend: Deployed on Railway/Render
- [ ] Frontend: Deployed on Netlify
- [ ] SSL: Enabled (free with hosting providers)
- [ ] Domain: Free subdomain or custom domain
- [ ] Environment variables: Set for production
- [ ] CORS: Configured for production domain
- [ ] Database indexes: Optimized
- [ ] Error monitoring: Basic logging enabled

## Cost Analysis (Monthly)
- MongoDB Atlas: FREE (512MB)
- Railway/Render: FREE (with limits)
- Netlify: FREE
- Domain (optional): $10-15/year
- **Total Monthly Cost: $0-5**

## Monitoring & Maintenance
- Monitor usage through each service's dashboard
- Set up alerts for usage limits
- Regular database backups (Atlas handles this)
- Monitor application logs

## Scaling Plan
As your business grows:
1. Upgrade MongoDB Atlas ($9/month for 2GB)
2. Upgrade hosting plans ($10-20/month)
3. Add custom domain and email
4. Implement advanced monitoring

## Support & Updates
- Version control through GitHub
- Easy rollbacks using git tags
- Continuous deployment from main branch
- Feature flags for gradual rollouts
