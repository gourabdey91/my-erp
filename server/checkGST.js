const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

async function checkGST() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/myerp');
    console.log('Connected to MongoDB');
    
    const gstToCheck = '21ABECS4385E1ZI';
    console.log(`\nChecking for hospitals with GST: ${gstToCheck}`);
    
    // Find any hospital with this GST number
    const existingHospital = await Hospital.findOne({ 
      gstNumber: gstToCheck.toUpperCase()
    });
    
    if (existingHospital) {
      console.log('FOUND EXISTING HOSPITAL:');
      console.log(`- ID: ${existingHospital._id}`);
      console.log(`- Short Name: ${existingHospital.shortName}`);
      console.log(`- Legal Name: ${existingHospital.legalName}`);
      console.log(`- GST Number: ${existingHospital.gstNumber}`);
      console.log(`- Business Unit: ${existingHospital.businessUnit}`);
      console.log(`- Is Active: ${existingHospital.isActive}`);
      console.log(`- Created: ${existingHospital.createdAt}`);
    } else {
      console.log('No hospital found with this GST number - should be available for use');
    }
    
    // Also check all hospitals to see their GST numbers
    console.log('\nAll active hospitals:');
    const allHospitals = await Hospital.find({ isActive: true }).select('shortName gstNumber businessUnit');
    allHospitals.forEach(h => {
      console.log(`- ${h.shortName}: ${h.gstNumber} (BusinessUnit: ${h.businessUnit})`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkGST();
