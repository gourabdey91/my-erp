const mongoose = require('mongoose');
const User = require('./models/User');

const deleteAndRecreateUser = async () => {
    try {
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true';
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to PROD database');

        // Delete existing user
        const deleted = await User.deleteOne({ email: 'deygourab91@gmail.com' });
        console.log(`🗑️  Deleted ${deleted.deletedCount} existing user(s)`);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        console.log('\n📝 Now run: node create-prod-user.js railway');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

deleteAndRecreateUser();
