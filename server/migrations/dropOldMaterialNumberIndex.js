const mongoose = require('mongoose');
require('dotenv').config();

async function dropOldIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the MaterialMaster collection
    const collection = mongoose.connection.db.collection('materialmasters');

    // List existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the old materialNumber_1 index if it exists
    try {
      await collection.dropIndex('materialNumber_1');
      console.log('Successfully dropped materialNumber_1 index');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('materialNumber_1 index not found (already dropped)');
      } else {
        console.error('Error dropping materialNumber_1 index:', error.message);
      }
    }

    // List indexes after dropping
    const indexesAfter = await collection.indexes();
    console.log('Indexes after cleanup:', indexesAfter.map(idx => ({ name: idx.name, key: idx.key })));

    console.log('Index cleanup completed');
  } catch (error) {
    console.error('Error during index cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropOldIndex();
