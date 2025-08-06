const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check current indexes
    console.log('Current indexes:');
    const indexes = await Hospital.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    // Drop the problematic hospitalCode index if it exists
    try {
      await Hospital.collection.dropIndex('hospitalCode_1');
      console.log('\nDropped hospitalCode_1 index');
    } catch (error) {
      console.log('\nhospitalCode_1 index not found or already dropped');
    }
    
    // Check if gstNumber index should be unique or not
    console.log('\nChecking GST number uniqueness requirements...');
    
    // Since we want global GST uniqueness, let's ensure the index exists and is unique
    try {
      await Hospital.collection.createIndex({ gstNumber: 1 }, { unique: true, sparse: true });
      console.log('Created/ensured unique index on gstNumber');
    } catch (error) {
      console.log('GST number index already exists:', error.message);
    }
    
    // Check updated indexes
    console.log('\nUpdated indexes:');
    const updatedIndexes = await Hospital.collection.getIndexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndexes();
