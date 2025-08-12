// Test script to verify the expense type assignment endpoint fix
// This tests the specific endpoint that was returning 404 errors

const https = require('https');

async function testExpenseTypeAssignmentEndpoint() {
    console.log('🔍 Testing Expense Type Assignment Endpoint Fix...\n');
    
    // Test the endpoint that was failing
    const hospitalId = '67711b5bb60a0ea5dd0bf5f1'; // CARE Hospital ID
    const url = `https://myerp-backend.onrender.com/api/expense-type-assignments/options/${hospitalId}`;
    
    return new Promise((resolve, reject) => {
        console.log(`📡 Testing: GET ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📊 Status Code: ${res.statusCode}`);
                console.log(`📝 Headers: ${JSON.stringify(res.headers, null, 2)}`);
                
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ SUCCESS: Endpoint is working correctly!');
                        console.log(`📋 Response Data:`, JSON.stringify(jsonData, null, 2));
                        resolve(jsonData);
                    } catch (error) {
                        console.log('⚠️  Response is not valid JSON:', data);
                        resolve(data);
                    }
                } else {
                    console.log(`❌ FAILED: Status ${res.statusCode}`);
                    console.log(`📄 Response: ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`💥 Network Error: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testHealthEndpoint() {
    console.log('\n🔍 Testing Backend Health Endpoint...\n');
    
    const url = 'https://myerp-backend.onrender.com/api/health';
    
    return new Promise((resolve, reject) => {
        console.log(`📡 Testing: GET ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📊 Status Code: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ Backend is healthy!');
                        console.log(`📋 Health Status:`, JSON.stringify(jsonData, null, 2));
                        resolve(jsonData);
                    } catch (error) {
                        console.log('⚠️  Response is not valid JSON:', data);
                        resolve(data);
                    }
                } else {
                    console.log(`❌ Backend health check failed: Status ${res.statusCode}`);
                    console.log(`📄 Response: ${data}`);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`💥 Network Error: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function runTests() {
    console.log('🚀 Production API Endpoint Verification\n');
    console.log('=' .repeat(60));
    
    try {
        // Test backend health first
        await testHealthEndpoint();
        
        // Test the specific endpoint that was failing
        await testExpenseTypeAssignmentEndpoint();
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 ALL TESTS PASSED! The API fix has been verified.');
        console.log('✅ Frontend can now successfully communicate with backend');
        console.log('✅ Expense type assignment endpoint is working correctly');
        console.log('📍 Production URLs:');
        console.log('   - Backend API: https://myerp-backend.onrender.com');
        console.log('   - Frontend: https://my-erp.onrender.com');
        
    } catch (error) {
        console.log('\n' + '=' .repeat(60));
        console.log('❌ TEST FAILED:', error.message);
        console.log('🔧 This indicates the backend may need attention');
    }
}

// Run the tests
runTests();
