const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const createProdUser = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        
        // Use local MongoDB URI for user creation first
        const mongoUri = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017/myerp-prod';
        console.log('Database URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'deygourab91@gmail.com' });
        if (existingUser) {
            console.log('⚠️  User already exists:', existingUser.email);
            console.log('User ID:', existingUser._id);
            console.log('Role:', existingUser.role);
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('Testingpass91#', saltRounds);

        // Create production user
        const prodUser = new User({
            name: 'Gourab Dey',
            email: 'deygourab91@gmail.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            businessUnitAccess: [], // Admin has access to all business units
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedUser = await prodUser.save();
        
        console.log('🎉 Production user created successfully!');
        console.log('📧 Email:', savedUser.email);
        console.log('🔑 User ID:', savedUser._id);
        console.log('👤 Role:', savedUser.role);
        console.log('✅ Status:', savedUser.isActive ? 'Active' : 'Inactive');
        
        console.log('\n🔐 Login Credentials:');
        console.log('Email: deygourab91@gmail.com');
        console.log('Password: Testingpass91#');
        
    } catch (error) {
        console.error('❌ Error creating production user:', error.message);
        if (error.code === 11000) {
            console.log('User with this email already exists');
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Alternative function to create user on Railway production
const createProdUserOnRailway = async () => {
    try {
        console.log('🚀 Creating user on Railway production database...');
        
        // Use the exact same URI that Railway uses - with correct password
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true';
        
        console.log('Database URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to Railway Production MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'deygourab91@gmail.com' });
        if (existingUser) {
            console.log('⚠️  User already exists:', existingUser.email);
            console.log('User ID:', existingUser._id);
            console.log('Role:', existingUser.role);
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('Testingpass91#', saltRounds);

        // Create production user
        const prodUser = new User({
            firstName: 'Gourab',
            lastName: 'Dey',
            email: 'deygourab91@gmail.com',
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            businessUnits: [], // Admin has access to all business units
            loginAttempts: 0
        });

        const savedUser = await prodUser.save();
        
        console.log('🎉 Production user created successfully on Railway!');
        console.log('📧 Email:', savedUser.email);
        console.log('🔑 User ID:', savedUser._id);
        console.log('👤 Role:', savedUser.role);
        console.log('✅ Status:', savedUser.isActive ? 'Active' : 'Inactive');
        
    } catch (error) {
        console.error('❌ Error creating production user on Railway:', error.message);
        if (error.code === 11000) {
            console.log('User with this email already exists');
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Run based on command line argument
const mode = process.argv[2] || 'local';

if (mode === 'railway') {
    createProdUserOnRailway();
} else {
    createProdUser();
}
