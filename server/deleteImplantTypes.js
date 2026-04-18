require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://myerp:Test12345@main-cluster.svki2gf.mongodb.net/myerp-dev?retryWrites=true&w=majority')
  .then(async () => {
    console.log('\n=== DELETING IMPLANT TYPES ===\n');

    // Import models
    const ImplantType = require('./models/ImplantType');

    try {
      // Get count before deletion
      const countBefore = await ImplantType.countDocuments({});
      console.log(`Implant Types before deletion: ${countBefore}`);

      // Delete all implant types
      const result = await ImplantType.deleteMany({});
      
      console.log(`✅ Deleted ${result.deletedCount} implant type records`);

      // Get count after deletion
      const countAfter = await ImplantType.countDocuments({});
      console.log(`Implant Types after deletion: ${countAfter}`);

      console.log('\n=== CLEANUP COMPLETE ===\n');
    } catch (error) {
      console.error('Error deleting implant types:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
