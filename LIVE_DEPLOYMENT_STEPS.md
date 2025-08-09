# 🚀 Live Deployment Steps for MyERP v1.0.0

## Current Status: ✅ Build Completed Successfully

### Environment Variables for Railway:
```
NODE_ENV=production
MONGO_URI=mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true&w=majority&appName=Main-Cluster
JWT_SECRET=MyERPv1.0ProdSecureKey2025!@#$%^&*()
CORS_ORIGIN=https://myerp-v1.netlify.app
```

## Step 1: Railway Backend Deployment

### A. Sign up at https://railway.app
1. Click "Start a New Project"
2. Connect with GitHub account
3. Authorize Railway to access repositories

### B. Deploy Backend
1. Click "Deploy from GitHub repo"  
2. Select repository: `gourabdey91/my-erp`
3. Railway will auto-detect it's a Node.js project
4. **Important**: Set these settings in Railway dashboard:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: Railway will auto-assign

### C. Add Environment Variables
In Railway dashboard, go to Variables tab and add:
- `NODE_ENV` = `production`
- `MONGO_URI` = `mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true&w=majority&appName=Main-Cluster`
- `JWT_SECRET` = `MyERPv1.0ProdSecureKey2025!@#$%^&*()`
- `CORS_ORIGIN` = `https://myerp-v1.netlify.app`

### D. Get Backend URL
After deployment, Railway will provide a URL like:
`https://myerp-backend-production-XXXX.up.railway.app`

## Step 2: Netlify Frontend Deployment

### A. Sign up at https://netlify.com
1. Click "Add new site"
2. Connect with GitHub
3. Select repository: `gourabdey91/my-erp`

### B. Configure Build Settings
- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/build`

### C. Add Environment Variables
In Netlify dashboard, go to Site Settings > Environment Variables:
- `REACT_APP_API_URL` = `https://your-railway-backend-url.railway.app`
- `NODE_ENV` = `production`
- `GENERATE_SOURCEMAP` = `false`

### D. Custom Domain (Optional)
- In Netlify: Site Settings > Domain Management
- Change site name to: `myerp-v1` 
- Your site will be: `https://myerp-v1.netlify.app`

## Step 3: Final Configuration

### A. Update CORS in Railway
After getting Netlify URL, update Railway environment variable:
- `CORS_ORIGIN` = `https://myerp-v1.netlify.app`

### B. Test Deployment
1. Visit your Netlify URL
2. Try to register/login
3. Test all modules
4. Verify mobile responsiveness

## Expected URLs:
- **Frontend**: https://myerp-v1.netlify.app
- **Backend**: https://your-app-name.railway.app
- **Backend Health**: https://your-app-name.railway.app/api/health

## Troubleshooting:
If anything fails:
1. Check Railway logs for backend errors
2. Check Netlify deploy logs for frontend errors
3. Verify environment variables are set correctly
4. Test API endpoints directly

## Success Indicators:
- ✅ Railway shows "Deployed" status
- ✅ Netlify shows "Published" status  
- ✅ Health check returns 200: `/api/health`
- ✅ Frontend loads without errors
- ✅ Login/registration works
- ✅ All modules are accessible

## Total Time: ~25 minutes
## Total Cost: $0/month (free tiers)

🎉 Your professional ERP system will be live!
