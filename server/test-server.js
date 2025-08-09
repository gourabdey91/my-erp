const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

console.log('Starting minimal test server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

app.get('/', (req, res) => {
  console.log('Root accessed');
  res.send('Hello Railway!');
});

app.get('/health', (req, res) => {
  console.log('Health check accessed');
  res.send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`✅ Time: ${new Date().toISOString()}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  process.exit(0);
});
