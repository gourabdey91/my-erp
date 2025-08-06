const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection with environment-based naming
const mongoUri = process.env.MONGO_URI;
console.log(`Starting in ${NODE_ENV} mode`);
console.log(`Connecting to database: ${mongoUri.split('@')[1].split('?')[0]}`); // Log only the cluster info, not credentials

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000', // Development
    'https://localhost:3000', // Development with HTTPS
    process.env.CORS_ORIGIN, // Production frontend URL
    // Add your production URLs here after deployment
    // 'https://your-app-name.netlify.app'
  ].filter(Boolean), // Remove undefined values
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Import routes
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const businessUnitRoutes = require('./routes/businessUnits');
const authRoutes = require('./routes/auth');
const companyDetailsRoutes = require('./routes/companyDetails');
const categoryRoutes = require('./routes/categories');
const paymentTypeRoutes = require('./routes/paymentTypes');
const procedureRoutes = require('./routes/procedures');
const expenseTypeRoutes = require('./routes/expenseTypes');
const doctorRoutes = require('./routes/doctors');
const hospitalRoutes = require('./routes/hospitals');

app.get('/', (req, res) => {
  res.send('ERP Billing App Backend');
});

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business-units', businessUnitRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/company-details', companyDetailsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payment-types', paymentTypeRoutes);
app.use('/api/procedures', procedureRoutes);
app.use('/api/expense-types', expenseTypeRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/hospitals', hospitalRoutes);

// MongoDB connection with environment awareness
mongoose.connect(mongoUri);

mongoose.connection.once('open', () => {
  console.log(`Connected to MongoDB (${NODE_ENV} environment)`);
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Database: ${dbName}`);
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
