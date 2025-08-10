const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createUserWithDebugging = async () => {
    try {
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true';
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to PROD database');

        // Delete existing user
        await User.deleteOne({ email: 'deygourab91@gmail.com' });
        console.log('🗑️ Deleted existing user');

        // Create new user with explicit password
        const plainPassword = 'Testingpass91#';
        console.log('🔐 Plain password:', plainPassword);
        
        // Hash password manually
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        console.log('🔒 Hashed password:', hashedPassword.substring(0, 30) + '...');
        
        // Test the hash immediately
        const testHash = await bcrypt.compare(plainPassword, hashedPassword);
        console.log('✅ Hash test before saving:', testHash);
        
        const prodUser = new User({
            firstName: 'Gourab',
            lastName: 'Dey',
            email: 'deygourab91@gmail.com',
            password: plainPassword, // Let the pre-save middleware handle hashing
            role: 'admin',
            status: 'active',
            businessUnits: [],
            loginAttempts: 0
        });

        const savedUser = await prodUser.save();
        console.log('🎉 User created with ID:', savedUser._id);
        
        // Test password immediately after save
        const passwordTest = await savedUser.comparePassword(plainPassword);
        console.log('✅ Password test after save:', passwordTest);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

createUserWithDebugging();
