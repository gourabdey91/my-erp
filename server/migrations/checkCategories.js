const mongoose = require('mongoose');
require('dotenv').config();

async function checkCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const Category = require('../models/Category');
    const categories = await Category.find({});
    
    console.log('Total categories:', categories.length);
    categories.forEach(cat => {
      console.log(`- ${cat.code}: ${cat.description} (BU: ${cat.businessUnitId}) ${cat.isActive ? 'Active' : 'Inactive'}`);
    });
    
    if (categories.length === 0) {
      console.log('No categories found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCategories();
