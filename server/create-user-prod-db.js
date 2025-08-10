const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');

const createProdUserInCorrectDB = async () => {
    try {
        console.log('🔌 Connecting to PRODUCTION MongoDB database...');
        
        // Use production database URI explicitly
        const mongoUri = 'mongodb+srv://gourabdey91:YHVTrGnavP92uMke@main-cluster.svki2gf.mongodb.net/myerp-prod?retryWrites=true&w=majority&appName=Main-Cluster';
        console.log('Database:', mongoUri.split('@')[1].split('?')[0]);
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB Production Database');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'deygourab91@gmail.com' });
        if (existingUser) {
            console.log('✅ Production user already exists:');
            console.log('- Email:', existingUser.email);
            console.log('- Role:', existingUser.role);
            console.log('- ID:', existingUser._id);
            await mongoose.disconnect();
            return;
        }

        // Create production admin user
        console.log('👤 Creating production admin user...');
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('Testingpass91#', saltRounds);

        const newUser = new User({
            name: 'Admin User',
            email: 'deygourab91@gmail.com',
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            businessUnits: [], // Will be populated when business units are created
            defaultBusinessUnit: null
        });

        const savedUser = await newUser.save();
        console.log('✅ Production admin user created successfully!');
        console.log('📧 Email:', savedUser.email);
        console.log('🔐 Password: Testingpass91#');
        console.log('👑 Role:', savedUser.role);
        console.log('🆔 User ID:', savedUser._id);

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error creating production user:', error.message);
        process.exit(1);
    }
};

createProdUserInCorrectDB();
