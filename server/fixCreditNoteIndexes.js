const mongoose = require('mongoose');
require('dotenv').config();

async function fixCreditNoteIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('creditnotes');
    
    // Check existing indexes
    console.log('\n=== Current Indexes on creditnotes collection ===');
    const indexes = await collection.listIndexes().toArray();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key), index.unique ? '[UNIQUE]' : '');
    });

    // Find the problematic unique index
    const problematicIndex = indexes.find(index => 
      index.name === 'hospital_1_paymentType_1_surgicalCategory_1' && index.unique === true
    );

    if (problematicIndex) {
      console.log('\n=== Found Problematic Unique Index ===');
      console.log('Index name:', problematicIndex.name);
      console.log('Index key:', JSON.stringify(problematicIndex.key));
      console.log('Unique constraint:', problematicIndex.unique);

      // Drop the problematic unique index
      console.log('\n=== Dropping Problematic Index ===');
      try {
        await collection.dropIndex('hospital_1_paymentType_1_surgicalCategory_1');
        console.log('✅ Successfully dropped unique index: hospital_1_paymentType_1_surgicalCategory_1');
      } catch (dropError) {
        console.log('❌ Error dropping index:', dropError.message);
      }
    } else {
      console.log('\n=== Problematic Index Not Found ===');
      console.log('The unique index hospital_1_paymentType_1_surgicalCategory_1 was not found.');
    }

    // Create a non-unique index for efficient querying (if needed)
    console.log('\n=== Creating Non-Unique Index for Efficient Querying ===');
    try {
      await collection.createIndex(
        { hospital: 1, paymentType: 1, surgicalCategory: 1, isActive: 1 },
        { 
          name: 'hospital_1_paymentType_1_surgicalCategory_1_isActive_1',
          background: true 
        }
      );
      console.log('✅ Created non-unique index for efficient querying');
    } catch (createError) {
      if (createError.code === 85) {
        console.log('ℹ️  Non-unique index already exists');
      } else {
        console.log('❌ Error creating non-unique index:', createError.message);
      }
    }

    // Show final index state
    console.log('\n=== Final Index State ===');
    const finalIndexes = await collection.listIndexes().toArray();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key), index.unique ? '[UNIQUE]' : '');
    });

    console.log('\n✅ Credit Note indexes have been fixed!');
    console.log('You can now create multiple credit note records for the same hospital + payment type combination.');

  } catch (error) {
    console.error('❌ Error fixing credit note indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixCreditNoteIndexes();
