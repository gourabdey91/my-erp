# ERP Application Deployment Guide

## 🚀 Quick Deployment Steps

### 1. MongoDB Atlas (Database) - FREE
- ✅ Already configured in server/.env
- Your connection string: `mongodb+srv://gourabdey91:...@main-cluster.svki2gf.mongodb.net/`

### 2. Railway (Backend) - FREE $5 credit/month
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your `my-erp` repository
5. Choose the `server` folder as root directory
6. Add environment variables:
   - `MONGO_URI`: (copy from server/.env)
   - `NODE_ENV`: production
7. Deploy! You'll get a URL like: `https://your-app-name.railway.app`

### 3. Netlify (Frontend) - FREE
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "New site from Git"
4. Select your `my-erp` repository
5. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Base directory: `client`
6. Add environment variable:
   - `REACT_APP_API_URL`: `https://your-railway-url.railway.app/api`
7. Deploy! You'll get a URL like: `https://your-app-name.netlify.app`

### 4. Connect Frontend to Backend
1. Copy your Railway URL
2. Update client/.env:
   ```
   REACT_APP_API_URL=https://your-railway-url.railway.app/api
   ```
3. Update server CORS in index.js:
   ```javascript
   origin: [
     'http://localhost:3000',
     'https://your-netlify-url.netlify.app'
   ]
   ```
4. Commit and push changes

## 🎯 Expected Result
- Frontend: https://your-app.netlify.app
- Backend: https://your-app.railway.app
- Database: MongoDB Atlas (cloud)
- Cost: $0/month for your volume!

## 🛠️ Local Development
```bash
# Start backend
cd server && npm start

# Start frontend (new terminal)
cd client && npm start
```

## 📊 Monitoring
- Railway: Built-in monitoring and logs
- Netlify: Analytics and deployment logs
- MongoDB Atlas: Database monitoring

## 🔧 Troubleshooting
- Check CORS settings if frontend can't connect to backend
- Verify environment variables are set correctly
- Check Railway/Netlify logs for deployment issues
