const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const BusinessUnit = require('./models/BusinessUnit');

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding');
    
    // Check environment - allow seeding in development or if database name contains 'dev'
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         mongoose.connection.db.databaseName.includes('dev');
    
    console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    console.log(`Development mode: ${isDevelopment}`);

    // Clear existing data (development only!)
    if (isDevelopment) {
      await User.deleteMany({});
      await BusinessUnit.deleteMany({});
      console.log('Cleared existing data');
    } else {
      console.log('Seeding not allowed in production environment');
      return;
    }

    // Create sample business units
    const businessUnits = await BusinessUnit.insertMany([
      {
        name: 'Main Office',
        code: 'MAIN',
        partners: ['Customer A', 'Customer B'],
        isActive: true
      },
      {
        name: 'Branch Office',
        code: 'BRANCH',
        partners: ['Customer C'],
        isActive: true
      },
      {
        name: 'Test Unit',
        code: 'TEST',
        partners: [],
        isActive: false
      }
    ]);

    console.log('Created business units:', businessUnits.length);

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.insertMany([
      {
        firstName: 'John',
        lastName: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'admin',
        status: 'active',
        businessUnits: [businessUnits[0]._id, businessUnits[1]._id],
        defaultBusinessUnit: businessUnits[0]._id
      },
      {
        firstName: 'Jane',
        lastName: 'User',
        email: 'user@example.com',
        password: hashedPassword,
        phone: '+0987654321',
        role: 'user',
        status: 'active',
        businessUnits: [businessUnits[1]._id],
        defaultBusinessUnit: businessUnits[1]._id
      },
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'inactive',
        businessUnits: [businessUnits[2]._id],
        defaultBusinessUnit: businessUnits[2]._id
      }
    ]);

    console.log('Created users:', users.length);
    console.log('Sample users created with password: password123');
    
    console.log('\n--- Development Data Summary ---');
    console.log('Business Units:');
    businessUnits.forEach(bu => {
      console.log(`  - ${bu.name} (${bu.code}) - ${bu.isActive ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\nUsers:');
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - ${user.status}`);
    });

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
