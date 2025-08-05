const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string - try multiple possible connections
const MONGODB_URI = process.env.MONGO_URI || 
                   process.env.MONGODB_URI || 
                   'mongodb+srv://gourabdey91:mhCnKEAAfX6ybNP4@cluster0.sdzly.mongodb.net/my-erp?retryWrites=true&w=majority' ||
                   'mongodb://localhost:27017/my-erp';

async function removeAddressFields() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log('Using connection string:', MONGODB_URI.replace(/\/\/[^@]*@/, '//***:***@')); // Hide password
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check how many users have address fields
    const usersWithAddress = await usersCollection.countDocuments({ address: { $exists: true } });
    console.log(`Found ${usersWithAddress} users with address fields`);

    if (usersWithAddress === 0) {
      console.log('No users have address fields. Migration not needed.');
      return;
    }

    // Remove address field from all user documents
    console.log('Removing address fields from all users...');
    const result = await usersCollection.updateMany(
      { address: { $exists: true } }, // Find documents that have address field
      { $unset: { address: "" } }     // Remove the address field
    );

    console.log(`Migration completed successfully!`);
    console.log(`- Documents matched: ${result.matchedCount}`);
    console.log(`- Documents modified: ${result.modifiedCount}`);

    // Verify the migration
    const remainingUsersWithAddress = await usersCollection.countDocuments({ address: { $exists: true } });
    console.log(`Users with address fields after migration: ${remainingUsersWithAddress}`);

    if (remainingUsersWithAddress === 0) {
      console.log('✅ Migration successful - All address fields removed');
    } else {
      console.log('⚠️  Some address fields may still exist');
    }

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  removeAddressFields()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = removeAddressFields;
