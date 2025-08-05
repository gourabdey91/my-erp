# 🔄 Production Database Backup Strategy

## 📋 Overview
This document outlines the backup strategy for the MyERP production database hosted on MongoDB Atlas.

## 🔐 MongoDB Atlas Backup Features

### Free Tier (M0) - Current Setup
- **Daily Snapshots**: Automatic daily backups
- **Retention**: 2 days
- **Recovery**: Full database restore only
- **Cost**: FREE

### Paid Tier (M2+) - Enhanced Options
- **Continuous Backup**: Point-in-time recovery
- **Retention**: 3-35 days (configurable)
- **Recovery**: Restore to any specific second
- **Cost**: $9/month for M2 cluster

## 🛠️ Manual Backup Scripts

### 1. Windows Batch Script
```bash
# Run weekly backup
scripts\backup-production.bat
```

### 2. Cross-Platform Shell Script
```bash
# For Linux/Mac/WSL
./scripts/backup-production.sh
```

### 3. Node.js Backup Manager
```bash
# Install dependencies first
npm install mongodb dotenv

# Create backup
node scripts/backup-manager.js backup

# Restore from backup
node scripts/backup-manager.js restore ./backups/myerp-prod-backup-2025-08-05.json
```

## 📅 Recommended Backup Schedule

### **For Small Business (Current):**
1. **MongoDB Atlas**: Daily automatic (free)
2. **Manual Backup**: Weekly using Node.js script
3. **Local Storage**: Keep last 5 backups
4. **Cloud Storage**: Monthly backup to Google Drive/Dropbox

### **For Growing Business:**
1. **Upgrade to M2**: $9/month for continuous backup
2. **Point-in-time Recovery**: Can restore to any second
3. **Automated Monitoring**: Email alerts for backup failures

## 🔧 Setup Instructions

### 1. Install MongoDB Database Tools
```bash
# Windows (using Chocolatey)
choco install mongodb-database-tools

# Or download from MongoDB website
# https://www.mongodb.com/try/download/database-tools
```

### 2. Set Up Backup Script
```bash
# Make backup directory
mkdir scripts/backups

# Test Node.js backup
cd scripts
node backup-manager.js backup
```

### 3. Schedule Regular Backups

#### Windows Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Weekly
4. Action: Start Program
5. Program: `node`
6. Arguments: `backup-manager.js backup`
7. Start in: `E:\SS Agency\Development\my-erp\scripts`

#### Linux/Mac Cron:
```bash
# Edit crontab
crontab -e

# Add weekly backup (every Sunday at 2 AM)
0 2 * * 0 cd /path/to/my-erp/scripts && node backup-manager.js backup
```

## 📊 Backup Verification

### Check Atlas Backups:
1. Login to MongoDB Atlas
2. Go to your cluster
3. Click "Backup" tab
4. View snapshot history

### Verify Local Backups:
```bash
# List backup files
ls -la scripts/backups/

# Check backup content
node scripts/backup-manager.js restore scripts/backups/latest-backup.json
```

## 🚨 Disaster Recovery Plan

### **Scenario 1: Accidental Data Loss**
1. **Check Atlas Snapshots**: Restore from daily backup (2-day window)
2. **Use Local Backup**: Restore from weekly manual backup
3. **Partial Recovery**: Use Node.js script to restore specific collections

### **Scenario 2: Database Corruption**
1. **Create New Database**: `myerp-prod-recovery`
2. **Restore from Backup**: Use latest clean backup
3. **Update Connection**: Point application to recovery database
4. **Verify Data**: Test all critical functions

### **Scenario 3: Atlas Service Issues**
1. **Local Development**: Switch to development database temporarily
2. **Alternative Hosting**: Migrate to self-hosted MongoDB
3. **Data Export**: Use local backups to restore elsewhere

## 💡 Best Practices

### **Security:**
- Store backup credentials securely
- Encrypt backup files if containing sensitive data
- Use separate Atlas user for backups (read-only)

### **Testing:**
- Test restore process monthly
- Verify backup integrity
- Document recovery procedures

### **Monitoring:**
- Set up backup failure alerts
- Monitor backup file sizes
- Track backup completion times

## 💰 Cost Optimization

### **Current Free Setup:**
- **Atlas Free Tier**: $0/month
- **Storage**: Local backup files (~few MB)
- **Time**: 10 minutes weekly manual backup

### **Recommended Upgrade Path:**
- **When to upgrade**: When business data becomes critical
- **M2 Cluster**: $9/month for continuous backup
- **ROI**: Peace of mind vs. cost of data loss

## 📞 Emergency Contacts

### **MongoDB Atlas Support:**
- **Free Tier**: Community forums
- **Paid Tier**: Direct support tickets
- **Documentation**: https://docs.atlas.mongodb.com/

### **Backup Recovery:**
- **Primary**: Use Atlas restore interface
- **Secondary**: Run local restore scripts
- **Emergency**: Contact MongoDB support (paid tiers)

---

**Last Updated**: August 5, 2025  
**Next Review**: September 5, 2025
