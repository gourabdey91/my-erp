const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check indexes on the hospitals collection
    const indexes = await Hospital.collection.getIndexes();
    console.log('Current indexes on hospitals collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Check existing hospital IDs
    const hospitals = await Hospital.find().select('hospitalId shortName businessUnit gstNumber');
    console.log('\nExisting hospitals and their IDs:');
    hospitals.forEach(h => {
      console.log(`- ${h.shortName}: ${h.hospitalId} (GST: ${h.gstNumber}, BusinessUnit: ${h.businessUnit})`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIndexes();
