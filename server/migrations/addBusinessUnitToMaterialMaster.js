const mongoose = require('mongoose');
const MaterialMaster = require('../models/MaterialMaster');
const BusinessUnit = require('../models/BusinessUnit');
require('dotenv').config();

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for migration');

    // Find the business unit with code BU002
    const bu002 = await BusinessUnit.findOne({ code: 'BU002' });
    
    if (!bu002) {
      console.error('Business Unit BU002 not found. Please create it first.');
      process.exit(1);
    }

    console.log(`Found Business Unit: ${bu002.code} - ${bu002.name}`);

    // Find all material master records that don't have businessUnitId
    const materialsWithoutBU = await MaterialMaster.find({ 
      businessUnitId: { $exists: false } 
    });

    console.log(`Found ${materialsWithoutBU.length} material master records without business unit`);

    if (materialsWithoutBU.length === 0) {
      console.log('No materials to update. Migration complete.');
      process.exit(0);
    }

    // Update all materials without businessUnitId to BU002
    const updateResult = await MaterialMaster.updateMany(
      { businessUnitId: { $exists: false } },
      { 
        $set: { 
          businessUnitId: bu002._id,
          updatedAt: new Date()
        }
      }
    );

    console.log(`Migration completed successfully:`);
    console.log(`- Updated ${updateResult.modifiedCount} material master records`);
    console.log(`- All records now assigned to Business Unit: ${bu002.code} - ${bu002.name}`);

    // Verify the migration
    const totalMaterials = await MaterialMaster.countDocuments({ isActive: true });
    const materialsWithBU = await MaterialMaster.countDocuments({ 
      businessUnitId: { $exists: true },
      isActive: true 
    });

    console.log(`\nVerification:`);
    console.log(`- Total active materials: ${totalMaterials}`);
    console.log(`- Materials with business unit: ${materialsWithBU}`);
    
    if (totalMaterials === materialsWithBU) {
      console.log('✅ All active materials now have business unit assigned');
    } else {
      console.log('⚠️ Some materials still missing business unit');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
