// Test MongoDB connection with different credential combinations
const mongoose = require('mongoose');

const testConnections = async () => {
    const testCases = [
        {
            name: 'Correct credentials - PROD database',
            uri: 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true'
        },
        {
            name: 'Correct credentials - DEV database',
            uri: 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-dev?retryWrites=true'
        }
    ];

    for (const test of testCases) {
        try {
            console.log(`\n🧪 Testing: ${test.name}`);
            console.log('URI:', test.uri.replace(/\/\/.*@/, '//***:***@'));
            
            await mongoose.connect(test.uri);
            console.log('✅ Connection successful!');
            
            // List collections
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📂 Collections found:', collections.length);
            collections.forEach(col => console.log(`  - ${col.name}`));
            
            await mongoose.disconnect();
        } catch (error) {
            console.log('❌ Connection failed:', error.message);
        }
    }
};

testConnections();
