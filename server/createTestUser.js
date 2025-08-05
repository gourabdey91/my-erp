const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'admin@myerp.com' });
    if (existingUser) {
      console.log('Test user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create test user
    const testUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@myerp.com',
      password: hashedPassword,
      businessUnits: [],
      defaultBusinessUnit: null,
      isActive: true
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: admin@myerp.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestUser();
