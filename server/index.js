const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection with environment-based naming
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
console.log(`Starting in ${NODE_ENV} mode`);

if (!mongoUri) {
  console.error('❌ MongoDB connection string not found!');
  console.error('Set MONGO_URI or MONGODB_URI environment variable');
  process.exit(1);
}

// Decode URL-encoded ampersands in MongoDB URI if present
const decodedMongoUri = mongoUri.replace(/%26/g, '&');
console.log(`Connecting to database: ${decodedMongoUri.split('@')[1].split('?')[0]}`); // Log only the cluster info, not credentials

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000', // Development
    'https://localhost:3000', // Development with HTTPS
    'https://my-erp.onrender.com', // Production frontend URL
    'https://myerp-frontend.onrender.com', // Alternative frontend URL
    process.env.CORS_ORIGIN, // Additional production frontend URL
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

// Render IP detection endpoint for MongoDB Atlas security
app.get('/detect-railway-ip', async (req, res) => {
  try {
    console.log(`IP detection endpoint accessed at ${new Date().toISOString()}`);
    
    // Try multiple IP detection services using built-in https module
    const https = require('https');
    
    const getIP = (url) => {
      return new Promise((resolve, reject) => {
        https.get(url, (response) => {
          let data = '';
          response.on('data', (chunk) => data += chunk);
          response.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.ip || parsed.origin);
            } catch (e) {
              resolve(data.trim());
            }
          });
        }).on('error', reject);
      });
    };
    
    // Try multiple services
    let detectedIP = null;
    const services = [
      'https://api.ipify.org?format=json',
      'https://httpbin.org/ip',
      'https://api64.ipify.org?format=json'
    ];
    
    for (const service of services) {
      try {
        detectedIP = await getIP(service);
        if (detectedIP) break;
      } catch (e) {
        console.log(`Failed to get IP from ${service}`);
      }
    }
    
    if (!detectedIP) {
      throw new Error('All IP detection services failed');
    }
    
    res.json({
      success: true,
      render_outbound_ip: detectedIP,
      mongodb_atlas_format: `${detectedIP}/32`,
      timestamp: new Date().toISOString(),
      instructions: [
        '1. Copy the IP address above',
        '2. Go to MongoDB Atlas → Network Access',
        '3. Delete the 0.0.0.0/0 entry (security risk)',
        `4. Add this IP: ${detectedIP}/32`,
        '5. Wait 2-3 minutes for changes to take effect',
        '6. Test your application endpoints'
      ],
      security_note: 'This replaces the insecure 0.0.0.0/0 setting with Render-specific access',
      platform: 'Render'
    });
    
  } catch (error) {
    console.error('Error detecting Render IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect Render IP address',
      fallback_instructions: [
        '1. Use these known Render IP ranges:',
        '   - 216.24.57.0/24',
        '   - 216.24.57.1/32 to 216.24.57.255/32',
        '2. Or temporarily use 0.0.0.0/0 for testing (less secure)',
        '3. Check Render documentation for current IP ranges'
      ],
      render_ip_ranges: [
        '216.24.57.0/24'
      ]
    });
  }
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
const inquiryRoutes = require('./routes/inquiry');
const templateRoutes = require('./routes/templates');

// Health check endpoint for production monitoring
app.get('/api/health', (req, res) => {
  const packageJson = require('./package.json');
  res.status(200).json({
    status: 'healthy',
    version: packageJson.version,
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
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/templates', templateRoutes);

// MongoDB connection with environment awareness
mongoose.connect(decodedMongoUri);

mongoose.connection.once('open', async () => {
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
