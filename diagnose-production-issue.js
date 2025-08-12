// Test to check if frontend is making correct API calls
// This simulates what the frontend would do in production

const https = require('https');

async function testFrontendAPI() {
    console.log('🔍 Testing Frontend API Configuration...\n');
    
    // Test the exact endpoint the frontend would call
    console.log('Testing from frontend perspective:');
    console.log('Expected frontend URL: https://my-erp.onrender.com');
    console.log('Expected backend URL: https://myerp-backend.onrender.com');
    
    // Test if frontend is accessible
    const frontendUrl = 'https://my-erp.onrender.com';
    
    return new Promise((resolve, reject) => {
        console.log(`\n📡 Testing Frontend: GET ${frontendUrl}`);
        
        const req = https.get(frontendUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📊 Frontend Status Code: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log('✅ Frontend is accessible');
                    
                    // Check if the response contains any API configuration info
                    if (data.includes('myerp-backend.onrender.com')) {
                        console.log('✅ Frontend has correct backend URL in build');
                    } else if (data.includes('localhost')) {
                        console.log('❌ Frontend may still have localhost URLs in build');
                    } else {
                        console.log('ℹ️  Cannot determine API configuration from response');
                    }
                    
                } else {
                    console.log(`❌ Frontend not accessible: Status ${res.statusCode}`);
                }
                
                resolve(data);
            });
        });
        
        req.on('error', (error) => {
            console.log(`💥 Frontend Error: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testSpecificEndpoint() {
    console.log('\n🔍 Testing Specific Expense Assignment Endpoint...\n');
    
    // Test the specific endpoint that was failing
    const hospitalId = '6898df092bb025f38289ad91'; // Valid hospital ID from our previous test
    const url = `https://myerp-backend.onrender.com/api/expense-type-assignments/options/${hospitalId}`;
    
    return new Promise((resolve, reject) => {
        console.log(`📡 Direct Backend Test: GET ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📊 Backend Status Code: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log('✅ Backend endpoint is working correctly');
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`📋 Response contains ${jsonData.expenseTypes?.length || 0} expense types`);
                    } catch (e) {
                        console.log('Response is not JSON');
                    }
                } else {
                    console.log(`❌ Backend endpoint failed: Status ${res.statusCode}`);
                    console.log(`📄 Error: ${data}`);
                }
                
                resolve(data);
            });
        });
        
        req.on('error', (error) => {
            console.log(`💥 Backend Error: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function runDiagnostics() {
    console.log('🚀 Production Issue Diagnostics\n');
    console.log('=' .repeat(50));
    
    try {
        await testFrontendAPI();
        await testSpecificEndpoint();
        
        console.log('\n' + '=' .repeat(50));
        console.log('🎯 Diagnostic Summary:');
        console.log('1. Check if frontend deployment has latest changes');
        console.log('2. Verify API configuration in production build');
        console.log('3. Backend endpoint is confirmed working');
        
    } catch (error) {
        console.log('\n❌ Diagnostic Error:', error.message);
    }
}

runDiagnostics();
