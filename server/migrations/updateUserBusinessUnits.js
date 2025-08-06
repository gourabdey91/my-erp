require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const BusinessUnit = require('../models/BusinessUnit');

async function updateUserBusinessUnits() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all current business units
    const businessUnits = await BusinessUnit.find({ isActive: true });
    console.log('📋 Found business units:', businessUnits.map(bu => `${bu.code}: ${bu.name}`));

    if (businessUnits.length === 0) {
      console.log('❌ No active business units found');
      return;
    }

    // Get all users
    const users = await User.find({});
    console.log('👥 Found', users.length, 'users');

    for (const user of users) {
      console.log(`\n🔄 Updating user: ${user.email}`);
      
      // Assign all available business units to the user
      const businessUnitIds = businessUnits.map(bu => bu._id);
      
      // Set the first business unit as default
      const defaultBusinessUnit = businessUnits[0]._id;
      
      await User.findByIdAndUpdate(user._id, {
        businessUnits: businessUnitIds,
        defaultBusinessUnit: defaultBusinessUnit
      });
      
      console.log(`✅ Updated ${user.email}:`);
      console.log(`   - Business Units: ${businessUnits.map(bu => bu.code).join(', ')}`);
      console.log(`   - Default: ${businessUnits[0].code}`);
    }

    console.log('\n🎉 All users updated successfully!');
    
    // Verify the updates
    console.log('\n🔍 Verification:');
    const updatedUsers = await User.find({})
      .populate('businessUnits', 'code name')
      .populate('defaultBusinessUnit', 'code name');
      
    for (const user of updatedUsers) {
      console.log(`${user.email}:`);
      console.log(`  Business Units: ${user.businessUnits.map(bu => `${bu.code}:${bu.name}`).join(', ')}`);
      console.log(`  Default: ${user.defaultBusinessUnit ? `${user.defaultBusinessUnit.code}:${user.defaultBusinessUnit.name}` : 'None'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n🔚 Closing connection...');
    await mongoose.disconnect();
    console.log('✅ Connection closed');
  }
}

// Run the update
updateUserBusinessUnits();
