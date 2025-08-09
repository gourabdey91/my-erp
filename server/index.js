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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Immediate health check - must be first
app.get('/health', (req, res) => {
  console.log(`Health check accessed at ${new Date().toISOString()}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

app.get('/', (req, res) => {
  console.log(`Root endpoint accessed at ${new Date().toISOString()}`);
  res.json({ 
    message: 'ERP Billing App Backend v1.0.0', 
    version: '1.0.0', 
    environment: NODE_ENV, 
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

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
const creditNoteRoutes = require('./routes/creditNotes');
const doctorAssignmentRoutes = require('./routes/doctorAssignments');
const expenseTypeAssignmentRoutes = require('./routes/expenseTypeAssignments');
const implantTypeRoutes = require('./routes/implantTypes');
const materialMasterRoutes = require('./routes/materialMaster');
const deliveryChallanDetailsRoutes = require('./routes/deliveryChallanDetails');
const fileUploadRoutes = require('./routes/fileUpload');
const salesOrderRoutes = require('./routes/salesOrders');

// Health check endpoint for production monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
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
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/doctor-assignments', doctorAssignmentRoutes);
app.use('/api/expense-type-assignments', expenseTypeAssignmentRoutes);
app.use('/api/implant-types', implantTypeRoutes);
app.use('/api/material-master', materialMasterRoutes);
app.use('/api/delivery-challan-details', deliveryChallanDetailsRoutes);
app.use('/api/file-upload', fileUploadRoutes);
app.use('/api/sales-orders', salesOrderRoutes);

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================`);
  console.log(`🚀 Server started successfully!`);
  console.log(`📊 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🏠 Root endpoint: http://0.0.0.0:${PORT}/`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`===============================`);
});
