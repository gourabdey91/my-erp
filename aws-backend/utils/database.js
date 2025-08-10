const mongoose = require('mongoose');

let cachedConnection = null;

/**
 * Database connection utility for AWS Lambda
 * Reuses connections across Lambda invocations for better performance
 */
const connectDB = async () => {
  // Return cached connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedConnection;
  }

  try {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    console.log('Establishing new database connection...');
    
    // Configure mongoose for Lambda environment
    mongoose.set('strictQuery', false);
    
    const connection = await mongoose.connect(mongoUri, {
      maxPoolSize: 1, // Limit connection pool for Lambda
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close socket after 45s of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0 // Disable mongoose buffering
    });

    cachedConnection = connection;
    console.log(`Connected to MongoDB: ${mongoose.connection.db.databaseName}`);
    
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Gracefully close database connection
 */
const closeDB = async () => {
  if (cachedConnection) {
    await mongoose.connection.close();
    cachedConnection = null;
    console.log('Database connection closed');
  }
};

module.exports = {
  connectDB,
  closeDB
};
