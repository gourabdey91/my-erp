console.log('Script is running...');

const mongoose = require('mongoose');
require('dotenv').config();

console.log('Environment loaded');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return mongoose.connection.db.collection('templates').countDocuments();
  })
  .then(count => {
    console.log('Template count:', count);
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('Connection closed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
