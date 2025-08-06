const mongoose = require('mongoose');
require('dotenv').config();

async function fixDoctorEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('doctors');

    // Drop the existing problematic index
    try {
      await collection.dropIndex('businessUnit_1_email_1');
      console.log('Dropped existing businessUnit_1_email_1 index');
    } catch (error) {
      console.log('Index may not exist or already dropped:', error.message);
    }

    // Create the new sparse index
    await collection.createIndex(
      { businessUnit: 1, email: 1 }, 
      { unique: true, sparse: true }
    );
    console.log('Created new sparse index on businessUnit_1_email_1');

    console.log('Index migration completed successfully');
  } catch (error) {
    console.error('Error during index migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixDoctorEmailIndex();
