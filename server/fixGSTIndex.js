const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

async function fixGSTIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Drop the existing non-unique GST index
    try {
      await Hospital.collection.dropIndex('gstNumber_1');
      console.log('Dropped existing gstNumber_1 index');
    } catch (error) {
      console.log('Could not drop gstNumber_1 index:', error.message);
    }
    
    // Create a new unique index on GST number
    try {
      await Hospital.collection.createIndex(
        { gstNumber: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'gstNumber_unique'
        }
      );
      console.log('Created unique index on gstNumber');
    } catch (error) {
      console.log('Error creating unique GST index:', error.message);
    }
    
    // Check final indexes
    console.log('\nFinal indexes:');
    const indexes = await Hospital.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixGSTIndex();
