/**
 * Database Migration: Fix NumberRange starting numbers for existing records
 * 
 * Purpose: Ensures all NumberRange records have correct startingNumber values
 * Run this once after deploying the NumberRange reset logic update
 * 
 * Usage: node fixNumberRangeStartingNumbers.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✓ Connected to MongoDB');
  
  try {
    const NumberRange = require('../models/NumberRange');
    
    // Define correct starting numbers for each document type
    const correctStartingNumbers = {
      'Inquiry': 11009,
      'SalesOrder': 10000000,
      'Billing': 100000,
      'CreditNote': 1000000,
      'PurchaseOrder': 5000000,
      'Invoice': 1000000
    };
    
    console.log('\n📋 Fixing NumberRange starting numbers...\n');
    
    // Get all active NumberRange records
    const ranges = await NumberRange.find({ isActive: true });
    console.log(`Found ${ranges.length} active NumberRange records`);
    
    let fixed = 0;
    let moved = 0;
    
    for (const range of ranges) {
      const correctNumber = correctStartingNumbers[range.documentType];
      
      if (!correctNumber) {
        console.log(`⚠️  ${range.documentType}: No predefined starting number (keeping as is)`);
        continue;
      }
      
      // Check if startingNumber needs fixing
      if (!range.startingNumber || range.startingNumber === 0) {
        console.log(`\n🔧 Fixing: ${range.documentType} (Business Unit: ${range.businessUnit})`);
        console.log(`  Before: startingNumber=${range.startingNumber || 'undefined'}, currentNumber=${range.currentNumber}`);
        
        range.startingNumber = correctNumber;
        
        // If currentNumber is way below the correct starting number, move it to the starting number
        if (range.currentNumber < correctNumber) {
          range.currentNumber = correctNumber;
          moved++;
          console.log(`  ✅ MOVED: startingNumber → ${correctNumber}, currentNumber → ${correctNumber}`);
        } else {
          fixed++;
          console.log(`  ✅ FIXED: startingNumber → ${correctNumber} (currentNumber preserved: ${range.currentNumber})`);
        }
        
        await range.save();
      } else if (range.startingNumber !== correctNumber) {
        console.log(`\n⚠️  ${range.documentType}: Has custom startingNumber ${range.startingNumber} (expected ${correctNumber})`);
        console.log(`  This is intentional if you set a custom starting number. Skipping...`);
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Fixed startingNumber: ${fixed}`);
    console.log(`   Moved currentNumber: ${moved}`);
    console.log(`\n🎯 Next inquiries will generate: EST00011009, EST00011010, EST00011011, etc.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
