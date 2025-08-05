require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function addLoginAttemptsFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Update all existing users to add the new fields
    const result = await User.updateMany(
      {}, // Update all users
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} users with login attempt fields`);

    // Log current user statuses
    const users = await User.find({}, 'email status loginAttempts lockUntil');
    console.log('\nCurrent user statuses:');
    users.forEach(user => {
      console.log(`${user.email}: ${user.status}, attempts: ${user.loginAttempts || 0}, locked: ${user.lockUntil ? 'Yes' : 'No'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addLoginAttemptsFields();
