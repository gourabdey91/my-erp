# 🚀 MyERP Migration from Railway to Render

## 🎯 **Why Migrate to Render:**
- ✅ **Static Outbound IPs** on FREE plan (solves MongoDB security)
- ✅ **Production-ready** free tier
- ✅ **Automatic SSL** and custom domains
- ✅ **GitHub integration** for auto-deploy
- ✅ **No IP change worries** when traveling

---

## 📋 **Migration Steps:**

### **Step 1: Prepare for Migration**

#### 1.1: Export Current Environment Variables
```bash
# Get current Railway variables
railway variables > railway-env-backup.txt
```

**Current Environment Variables to Migrate:**
```
NODE_ENV=production
JWT_SECRET=MyERPv1.0ProdSecureKey2025
MONGO_URI=mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true
```

#### 1.2: Create Render Configuration File
Create `render.yaml` in your project root:

### **Step 2: Setup Render Account**

1. **Go to Render**: https://render.com/
2. **Sign up** with GitHub (recommended)
3. **Connect your GitHub account**
4. **Authorize Render** to access your repositories

### **Step 3: Create Render Web Service**

1. **Click "New +"** in Render dashboard
2. **Select "Web Service"**
3. **Connect GitHub repository**: `gourabdey91/my-erp`
4. **Configure service**:
   - **Name**: `my-erp-production`
   - **Region**: `Oregon (US West)` or `Ohio (US East)`
   - **Branch**: `main`
   - **Root Directory**: Leave empty (since server is in subdirectory)
   - **Runtime**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

### **Step 4: Configure Environment Variables**

In Render service settings, add these environment variables:
```
NODE_ENV=production
JWT_SECRET=MyERPv1.0ProdSecureKey2025
MONGO_URI=mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true
PORT=8080
```

### **Step 5: Get Render's Static IP**

1. **After deployment**, Render will show you the static outbound IP
2. **Note this IP address** - it never changes
3. **Alternative**: Check Render docs for their static IP ranges

### **Step 6: Update MongoDB Atlas Security**

1. **Go to MongoDB Atlas** → Network Access
2. **Delete** the current `0.0.0.0/0` entry
3. **Add Render's static IP**: `RENDER_IP/32`
4. **Test connection** after 2-3 minutes

---

## ⚙️ **Project Configuration for Render:**

### Update package.json (root level)
```json
{
  "name": "my-erp",
  "version": "1.0.0",
  "scripts": {
    "build": "cd server && npm install",
    "start": "cd server && npm start",
    "dev": "cd server && npm run dev"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Create render.yaml Configuration
```yaml
services:
  - type: web
    name: my-erp-backend
    env: node
    region: oregon
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        value: MyERPv1.0ProdSecureKey2025
      - key: MONGO_URI
        value: mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true
```

---

## 🔄 **Migration Timeline:**

### **Phase 1: Setup (Today)**
1. ✅ Create Render account
2. ✅ Configure repository connection
3. ✅ Set environment variables
4. ✅ Deploy to Render
5. ✅ Get static IP address

### **Phase 2: Security (Today)**
1. ✅ Update MongoDB Atlas with Render IP
2. ✅ Test all endpoints
3. ✅ Verify login functionality

### **Phase 3: Cleanup (After Testing)**
1. ✅ Update frontend to use Render URLs
2. ✅ Cancel Railway subscription
3. ✅ Update documentation

---

## 🌐 **Expected URLs After Migration:**
- **Main App**: `https://my-erp-backend.onrender.com`
- **Health**: `https://my-erp-backend.onrender.com/health`
- **API**: `https://my-erp-backend.onrender.com/api`

---

## ✅ **Benefits of Render Migration:**
- 🔒 **Static IP** = No more security worries
- 💰 **Free tier** = $5/month savings
- 🚀 **Production ready** = Better performance
- 🛡️ **Automatic SSL** = Enhanced security
- 📈 **Better uptime** = More reliable

---

## 🚨 **Rollback Plan (If Needed):**
1. Keep Railway running during migration
2. Test Render thoroughly before switching
3. Can switch back to Railway if issues
4. MongoDB Atlas can have multiple IPs whitelisted

Ready to start the migration? 🚀
