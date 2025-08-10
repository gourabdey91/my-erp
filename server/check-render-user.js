const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const checkProdUser = async () => {
    try {
        console.log('🔌 Connecting to production MongoDB...');
        
        // Use the exact same connection as your production deployment
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        console.log('Using database:', mongoUri ? mongoUri.split('@')[1].split('?')[0] : 'No URI found');
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB successfully');

        // Check if user exists
        const user = await User.findOne({ email: 'deygourab91@gmail.com' });
        
        if (user) {
            console.log('✅ Production user found:');
            console.log('- Email:', user.email);
            console.log('- Name:', user.name);
            console.log('- Role:', user.role);
            console.log('- ID:', user._id);
            console.log('- Business Units:', user.businessUnits);
            console.log('- Created:', user.createdAt);
            console.log('- Password Hash exists:', !!user.password);
        } else {
            console.log('❌ Production user NOT found');
            console.log('Checking all users in database...');
            
            const allUsers = await User.find({}).limit(5);
            console.log(`Found ${allUsers.length} users total:`);
            allUsers.forEach((u, i) => {
                console.log(`${i+1}. Email: ${u.email}, Role: ${u.role}`);
            });
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        
    } catch (error) {
        console.error('❌ Error checking production user:', error.message);
        process.exit(1);
    }
};

checkProdUser();
