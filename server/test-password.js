const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const testPassword = async () => {
    try {
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true';
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to PROD database');

        const user = await User.findOne({ email: 'deygourab91@gmail.com' });
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('📧 Found user:', user.email);
        console.log('🔑 Stored password hash:', user.password.substring(0, 20) + '...');
        
        // Test password comparison
        const testPassword = 'Testingpass91#';
        console.log('🧪 Testing password:', testPassword);
        
        const isMatch = await user.comparePassword(testPassword);
        console.log('✅ Password match:', isMatch);
        
        // Also test direct bcrypt comparison
        const directMatch = await bcrypt.compare(testPassword, user.password);
        console.log('✅ Direct bcrypt match:', directMatch);
        
        // Test manual hash creation
        const manualHash = await bcrypt.hash(testPassword, 12);
        console.log('🔧 Manual hash:', manualHash.substring(0, 20) + '...');
        
        const manualMatch = await bcrypt.compare(testPassword, manualHash);
        console.log('✅ Manual hash match:', manualMatch);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

testPassword();
