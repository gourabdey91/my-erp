const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000', // Development
    'https://localhost:3000', // Development with HTTPS
    // Add your production URLs here after deployment
    // 'https://your-app-name.netlify.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Import routes
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const businessUnitRoutes = require('./routes/businessUnits');

app.get('/', (req, res) => {
  res.send('ERP Billing App Backend');
});

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business-units', businessUnitRoutes);

// MongoDB connection placeholder
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
