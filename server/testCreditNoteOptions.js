const mongoose = require('mongoose');
const PaymentType = require('./models/PaymentType');
const Category = require('./models/Category');
const Procedure = require('./models/Procedure');
require('dotenv').config();

async function testCreditNoteOptions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Test with a sample business unit ID (use one from your existing data)
    const businessUnitId = '68920a453993bf82a0512c02'; // Update this with a real business unit ID
    
    console.log('Testing credit note options for business unit:', businessUnitId);
    
    console.log('\n=== Testing Payment Types ===');
    try {
      const paymentTypes = await PaymentType.find({
        businessUnitId: businessUnitId,
        isActive: true
      }).select('_id code description').sort({ description: 1 });
      console.log('Payment types found:', paymentTypes.length);
      paymentTypes.forEach(pt => console.log(`- ${pt.code}: ${pt.description}`));
    } catch (error) {
      console.error('Payment Types Error:', error);
    }
    
    console.log('\n=== Testing Categories ===');
    try {
      const categories = await Category.find({
        businessUnitId: businessUnitId,
        isActive: true
      }).select('_id code description').sort({ description: 1 });
      console.log('Categories found:', categories.length);
      categories.forEach(cat => console.log(`- ${cat.code}: ${cat.description}`));
    } catch (error) {
      console.error('Categories Error:', error);
    }
    
    console.log('\n=== Testing Procedures ===');
    try {
      const procedures = await Procedure.find({
        businessUnitId: businessUnitId,
        isActive: true
      }).select('_id code description').sort({ description: 1 });
      console.log('Procedures found:', procedures.length);
      procedures.forEach(proc => console.log(`- ${proc.code}: ${proc.description}`));
    } catch (error) {
      console.error('Procedures Error:', error);
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testCreditNoteOptions();
