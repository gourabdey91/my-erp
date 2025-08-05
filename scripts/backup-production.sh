#!/bin/bash
# Production Database Backup Script
# Run this weekly or as needed

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="myerp-prod-backup-$DATE"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🔄 Starting backup of production database..."
echo "📅 Backup date: $(date)"

# MongoDB dump (requires MongoDB tools installed)
mongodump \
  --uri="mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true&w=majority" \
  --out="$BACKUP_DIR/$BACKUP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    echo "📁 Backup location: $BACKUP_DIR/$BACKUP_NAME"
    
    # Compress backup
    cd $BACKUP_DIR
    tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    echo "🗜️  Backup compressed: $BACKUP_NAME.tar.gz"
    
    # Keep only last 5 backups
    ls -t *.tar.gz | tail -n +6 | xargs -d '\n' rm -f --
    echo "🧹 Old backups cleaned (keeping last 5)"
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "✨ Backup process completed!"
