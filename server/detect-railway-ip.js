const https = require('https');

const detectRailwayIP = async () => {
    console.log('🔍 Detecting Railway\'s outbound IP address...\n');
    
    const services = [
        'https://api.ipify.org?format=json',
        'https://httpbin.org/ip',
        'https://icanhazip.com',
        'https://api.my-ip.io/ip'
    ];
    
    for (const service of services) {
        try {
            console.log(`📡 Checking: ${service}`);
            
            if (service.includes('ipify')) {
                const response = await fetch(service);
                const data = await response.json();
                console.log(`✅ Railway IP (ipify): ${data.ip}\n`);
            } else if (service.includes('httpbin')) {
                const response = await fetch(service);
                const data = await response.json();
                console.log(`✅ Railway IP (httpbin): ${data.origin}\n`);
            } else if (service.includes('icanhazip')) {
                const response = await fetch(service);
                const ip = await response.text();
                console.log(`✅ Railway IP (icanhazip): ${ip.trim()}\n`);
            } else if (service.includes('my-ip.io')) {
                const response = await fetch(service);
                const ip = await response.text();
                console.log(`✅ Railway IP (my-ip.io): ${ip.trim()}\n`);
            }
            
            // Only need one successful response
            break;
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the IP address above');
    console.log('2. Go to MongoDB Atlas → Network Access');
    console.log('3. Remove 0.0.0.0/0 entry');
    console.log('4. Add the Railway IP with /32 suffix');
    console.log('   Example: XXX.XXX.XXX.XXX/32');
    console.log('5. Wait 2-3 minutes for changes');
    console.log('6. Test: npm run test-production');
};

// For Railway deployment, we can create an endpoint
if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Running on Railway - creating IP detection endpoint...');
    
    const express = require('express');
    const app = express();
    
    app.get('/detect-ip', async (req, res) => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            
            res.json({
                railway_ip: data.ip,
                timestamp: new Date().toISOString(),
                instructions: [
                    'Copy this IP address',
                    'Go to MongoDB Atlas → Network Access',
                    'Remove 0.0.0.0/0 entry',
                    `Add ${data.ip}/32 to allowed IPs`
                ]
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`IP detection endpoint available at: http://localhost:${port}/detect-ip`);
    });
} else {
    // Run locally
    detectRailwayIP();
}

module.exports = { detectRailwayIP };
