const mongoose = require('mongoose');

const runTemplateMigration = async () => {
  try {
    console.log('🔄 Running template migration for hospital fields...');
    
    // Import the Template model to ensure we're using the latest schema
    const Template = require('../models/Template');
    
    // Update all existing templates to have the new fields
    const result = await Template.updateMany(
      { 
        $or: [
          { hospitalDependent: { $exists: false } },
          { hospitalDependent: null },
          { hospitalDependent: undefined }
        ]
      },
      { 
        $set: { 
          hospitalDependent: false
          // Note: Don't set hospital field - it should remain undefined when hospitalDependent is false
        } 
      }
    );
    
    console.log(`✅ Template migration completed. Updated ${result.modifiedCount} templates`);
    
    // Verify the migration
    const totalTemplates = await Template.countDocuments({});
    const templatesWithHospitalDependent = await Template.countDocuments({ hospitalDependent: { $exists: true } });
    
    console.log(`📊 Migration summary: ${templatesWithHospitalDependent}/${totalTemplates} templates have hospitalDependent field`);
    
    return true;
  } catch (error) {
    console.error('❌ Template migration failed:', error);
    return false;
  }
};

module.exports = runTemplateMigration;
