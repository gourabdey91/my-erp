# Environment & Data Separation Guide

## 🎯 Overview
This guide explains how to separate development and production data for the ERP application.

## 🗄️ Database Separation Strategy

### **Method 1: Separate Databases (Implemented)**
- **Development**: `myerp-dev` database
- **Production**: `myerp-prod` database
- **Same MongoDB cluster, different database names**

### **Database URLs**
```
Development: mongodb+srv://...@cluster.../myerp-dev
Production:  mongodb+srv://...@cluster.../myerp-prod
```

## 🔧 Environment Configuration

### **Development (.env)**
```properties
NODE_ENV=development
MONGO_URI=mongodb+srv://...@cluster.../myerp-dev?...
PORT=5000
```

### **Production (.env.production)**
```properties
NODE_ENV=production
MONGO_URI=mongodb+srv://...@cluster.../myerp-prod?...
PORT=5000
CORS_ORIGIN=https://your-app.netlify.app
```

## 🌱 Development Data Seeding

### **Quick Setup for Development**
```bash
# 1. Seed development database with sample data
cd server
npm run seed:dev

# 2. Start development server
npm run dev
```

### **Sample Data Created**
**Business Units:**
- Main Office (MAIN) - Active
- Branch Office (BRANCH) - Active  
- Test Unit (TEST) - Inactive

**Users:**
- admin@example.com (Admin, password: password123)
- user@example.com (User, password: password123)
- test@example.com (Inactive user, password: password123)

## 🚀 Production Deployment

### **Railway Environment Variables**
Set these in Railway dashboard:
```
NODE_ENV=production
MONGO_URI=mongodb+srv://...@cluster.../myerp-prod?...
CORS_ORIGIN=https://your-app.netlify.app
```

### **Production Data**
- **Clean start**: No seeded data
- **Real data**: Created through the application
- **No development users**: Production users created manually

## 🔐 Security Considerations

### **Environment Files**
```
server/.env              # Development (local only)
server/.env.production   # Template (never commit with real values)
```

### **Git Ignore**
Ensure `.env` files are in `.gitignore`:
```
# Environment variables
.env
.env.local
.env.production
```

### **Railway Deployment**
- Environment variables set through Railway dashboard
- No `.env` files needed in production
- Secure credential management

## 📊 Data Management

### **Development Workflow**
1. **Reset development data**: `npm run seed:dev`
2. **Test features**: Use seeded sample data
3. **Clean testing**: Reset anytime without affecting production

### **Production Workflow**
1. **Initial setup**: Create admin user through application
2. **Real data**: All data created through normal application usage
3. **Backups**: MongoDB Atlas automatic backups
4. **No seeding**: Production data is never auto-generated

## 🔄 Switching Between Environments

### **Local Development**
```bash
# Use development database
NODE_ENV=development npm start
```

### **Production Testing Locally**
```bash
# Use production database (careful!)
NODE_ENV=production npm start
```

### **Best Practice**
- **Always use development environment locally**
- **Test with seeded data**
- **Never run seeds on production**

## 🛠️ Database Management

### **MongoDB Atlas Setup**
1. **Single Cluster**: Cost-effective
2. **Multiple Databases**: `myerp-dev`, `myerp-prod`
3. **Same Connection String**: Different database names
4. **Automatic Separation**: No data mixing

### **Backup Strategy**
- **Development**: No backup needed (can reseed)
- **Production**: MongoDB Atlas automatic backups
- **Manual Exports**: For important production data

## 🚨 Important Notes

### **⚠️ Never Mix Data**
- Development changes don't affect production
- Production is always clean and real
- Clear separation prevents accidents

### **🔒 Production Safety**
- Seeding disabled in production environment
- Environment checks prevent accidental data clearing
- Separate databases ensure complete isolation

### **📈 Scaling Considerations**
- Easy to add staging environment (myerp-staging)
- Can separate to different clusters if needed
- Ready for multiple environment deployment

## 🎯 Quick Commands

```bash
# Development
npm run seed:dev    # Reset development data
npm run dev         # Start development server

# Production (Railway handles this)
npm start          # Start production server
```

This setup ensures your development work never affects production data while maintaining easy development workflows.
