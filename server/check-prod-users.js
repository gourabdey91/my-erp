const mongoose = require('mongoose');
const User = require('./models/User');

const checkProdUser = async () => {
    try {
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true';
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to PROD database');

        // Check all users in production database
        const users = await User.find({});
        console.log(`\n👥 Users in PROD database (${users.length}):`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   Name: ${user.firstName} ${user.lastName}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Login Attempts: ${user.loginAttempts}`);
            console.log(`   ID: ${user._id}`);
            console.log('   ---');
        });

        // Look specifically for the admin user
        const adminUser = await User.findOne({ email: 'deygourab91@gmail.com' });
        if (adminUser) {
            console.log('✅ Admin user found in PROD database!');
            console.log('📧 Email:', adminUser.email);
            console.log('👤 Name:', `${adminUser.firstName} ${adminUser.lastName}`);
            console.log('🔑 Role:', adminUser.role);
            console.log('✅ Status:', adminUser.status);
            console.log('🔒 Login Attempts:', adminUser.loginAttempts);
        } else {
            console.log('❌ Admin user NOT found in PROD database');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

checkProdUser();
