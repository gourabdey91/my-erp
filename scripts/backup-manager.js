const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../server/.env.production' });

async function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `myerp-prod-backup-${timestamp}`;
    
    try {
        console.log('🔄 Starting Node.js backup script...');
        console.log('📅 Backup timestamp:', new Date().toLocaleString());
        
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        
        console.log('🔗 Connected to MongoDB Atlas');
        
        const db = client.db('myerp-prod');
        
        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`📊 Found ${collections.length} collections to backup`);
        
        const backupData = {};
        
        // Backup each collection
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`📦 Backing up collection: ${collectionName}`);
            
            const collection = db.collection(collectionName);
            const documents = await collection.find({}).toArray();
            backupData[collectionName] = documents;
            
            console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
        }
        
        // Save backup to file
        const fs = require('fs').promises;
        const backupDir = './backups';
        
        // Create backup directory
        try {
            await fs.access(backupDir);
        } catch {
            await fs.mkdir(backupDir, { recursive: true });
        }
        
        const backupFile = `${backupDir}/${backupName}.json`;
        await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
        
        console.log(`💾 Backup saved to: ${backupFile}`);
        console.log(`📏 Backup file size: ${(JSON.stringify(backupData).length / 1024).toFixed(2)} KB`);
        
        await client.close();
        console.log('✨ Backup completed successfully!');
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        process.exit(1);
    }
}

async function restoreDatabase(backupFile) {
    try {
        console.log('🔄 Starting database restore...');
        console.log('📁 Restore file:', backupFile);
        
        const fs = require('fs').promises;
        const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
        
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        
        console.log('🔗 Connected to MongoDB Atlas');
        
        const db = client.db('myerp-prod');
        
        // Restore each collection
        for (const [collectionName, documents] of Object.entries(backupData)) {
            console.log(`📦 Restoring collection: ${collectionName}`);
            
            const collection = db.collection(collectionName);
            
            // Clear existing data (optional - uncomment if needed)
            // await collection.deleteMany({});
            
            if (documents.length > 0) {
                await collection.insertMany(documents);
                console.log(`✅ Restored ${documents.length} documents to ${collectionName}`);
            }
        }
        
        await client.close();
        console.log('✨ Restore completed successfully!');
        
    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        process.exit(1);
    }
}

// Command line usage
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'backup') {
        backupDatabase();
    } else if (command === 'restore') {
        const backupFile = process.argv[3];
        if (!backupFile) {
            console.error('❌ Please provide backup file path');
            console.log('Usage: node backup-manager.js restore <backup-file>');
            process.exit(1);
        }
        restoreDatabase(backupFile);
    } else {
        console.log('Usage:');
        console.log('  node backup-manager.js backup');
        console.log('  node backup-manager.js restore <backup-file>');
    }
}

module.exports = { backupDatabase, restoreDatabase };
