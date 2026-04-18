// Script to clear data for re-upload
// Clears:
// 1. All Implant Types (with subcategories)
// 2. All Material Masters
// 3. All Material Assignments from Hospitals

const mongoose = require('mongoose');
require('dotenv').config();

const ImplantType = require('./models/ImplantType');
const MaterialMaster = require('./models/MaterialMaster');
const Hospital = require('./models/Hospital');

async function clearDataForReupload() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Clear all Implant Types
    console.log('\n--- Clearing Implant Types ---');
    const implantTypesDeleted = await ImplantType.deleteMany({});
    console.log(`✓ Deleted ${implantTypesDeleted.deletedCount} implant type records`);

    // 2. Clear all Material Masters
    console.log('\n--- Clearing Material Masters ---');
    const materialMastersDeleted = await MaterialMaster.deleteMany({});
    console.log(`✓ Deleted ${materialMastersDeleted.deletedCount} material master records`);

    // 3. Clear all Material Assignments from Hospitals
    console.log('\n--- Clearing Material Assignments from Hospitals ---');
    const hospitalsUpdated = await Hospital.updateMany(
      {},
      { $set: { materialAssignments: [] } }
    );
    console.log(`✓ Updated ${hospitalsUpdated.modifiedCount} hospital records`);
    console.log(`✓ Cleared all material assignments from hospitals`);

    console.log('\n========================================');
    console.log('✅ DATA CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`- Implant Types deleted: ${implantTypesDeleted.deletedCount}`);
    console.log(`- Material Masters deleted: ${materialMastersDeleted.deletedCount}`);
    console.log(`- Hospitals with material assignments cleared: ${hospitalsUpdated.modifiedCount}`);
    console.log('\nYou can now upload the data again.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the cleanup
clearDataForReupload();
