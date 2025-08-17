const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const migrateTemplates = async () => {
  try {
    await connectDB();
    
    // Import the Template model
    const Template = require('./models/Template');
    
    console.log('Checking existing templates...');
    
    // Find all templates
    const templates = await Template.find({}).lean();
    console.log(`Found ${templates.length} templates`);
    
    // Check which templates are missing the new fields
    const templatesNeedingMigration = templates.filter(template => 
      template.hospitalDependent === undefined || template.hospital === undefined
    );
    
    console.log(`${templatesNeedingMigration.length} templates need migration`);
    
    if (templatesNeedingMigration.length > 0) {
      console.log('Migrating templates...');
      
      // Update all templates to have the new fields with default values
      const result = await Template.updateMany(
        {
          $or: [
            { hospitalDependent: { $exists: false } },
            { hospital: { $exists: false } }
          ]
        },
        {
          $set: {
            hospitalDependent: false,
            // Don't set hospital field - let it remain undefined when hospitalDependent is false
          }
        }
      );
      
      console.log(`Migration completed. Modified ${result.modifiedCount} templates`);
    } else {
      console.log('All templates already have the new fields');
    }
    
    // Verify the migration
    const updatedTemplates = await Template.find({}).lean();
    console.log('\nTemplate field status:');
    updatedTemplates.forEach((template, index) => {
      console.log(`Template ${index + 1}: hospitalDependent=${template.hospitalDependent}, hospital=${template.hospital ? 'set' : 'not set'}`);
    });
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run migration
migrateTemplates();
