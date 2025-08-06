const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    console.log('Current indexes:');
    const indexes = await db.collection('doctors').listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.sparse ? '(sparse)' : '(not sparse)'}`);
    });
    
    // Drop ALL existing indexes except _id
    console.log('\nDropping all custom indexes...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await db.collection('doctors').dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`Could not drop ${index.name}: ${error.message}`);
        }
      }
    }
    
    // Create new sparse indexes
    console.log('\nCreating new sparse indexes...');
    
    // Sparse unique index for businessUnit + email (only when email is not null)
    await db.collection('doctors').createIndex(
      { businessUnit: 1, email: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'businessUnit_1_email_1_sparse'
      }
    );
    console.log('Created sparse unique index: businessUnit_1_email_1_sparse');
    
    // Unique index for businessUnit + doctorId
    await db.collection('doctors').createIndex(
      { businessUnit: 1, doctorId: 1 }, 
      { 
        unique: true,
        name: 'businessUnit_1_doctorId_1'
      }
    );
    console.log('Created unique index: businessUnit_1_doctorId_1');
    
    console.log('\nFinal indexes:');
    const finalIndexes = await db.collection('doctors').listIndexes().toArray();
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.sparse ? '(sparse)' : '(not sparse)'} ${index.unique ? '(unique)' : ''}`);
    });
    
    console.log('\nIndex fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
