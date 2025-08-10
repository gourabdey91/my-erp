const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they're registered
const BusinessUnit = require('./models/BusinessUnit');
const User = require('./models/User');
const Category = require('./models/Category');
const PaymentType = require('./models/PaymentType');
const Doctor = require('./models/Doctor');
const Hospital = require('./models/Hospital');
const ImplantType = require('./models/ImplantType');
const MaterialMaster = require('./models/MaterialMaster');
const Procedure = require('./models/Procedure');
const ExpenseType = require('./models/ExpenseType');
const CompanyDetails = require('./models/CompanyDetails');

async function initializeDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');
    
    const dbName = mongoose.connection.db.databaseName;
    console.log(`Connected to database: ${dbName}`);
    
    // Create indexes for all models (this will create the collections)
    const models = [
      BusinessUnit, User, Category, PaymentType, Doctor, 
      Hospital, ImplantType, MaterialMaster, Procedure, 
      ExpenseType, CompanyDetails
    ];
    
    console.log('Ensuring collections exist...');
    for (const Model of models) {
      await Model.createCollection();
      console.log(`✓ Collection created/verified: ${Model.collection.name}`);
    }
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nExisting collections:');
    collections.forEach(col => console.log(`- ${col.name}`));
    
    console.log('\nDatabase initialization completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
