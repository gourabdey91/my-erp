const mongoose = require('mongoose');
require('dotenv').config();

async function checkDoctors() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('doctors');

    const doctors = await collection.find({}).toArray();
    console.log('Existing doctors:', doctors.map(d => ({ 
      name: d.name, 
      doctorId: d.doctorId, 
      businessUnit: d.businessUnit 
    })));

    console.log('Total doctors:', doctors.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDoctors();
