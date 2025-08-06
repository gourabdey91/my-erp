const mongoose = require('mongoose');
require('dotenv').config();

async function clearDoctors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('doctors');

    const result = await collection.deleteMany({});
    console.log(`Deleted ${result.deletedCount} doctors`);

    console.log('Doctors collection cleared');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

clearDoctors();
