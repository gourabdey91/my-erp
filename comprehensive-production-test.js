// Comprehensive test to identify the exact issue in production
const https = require('https');

async function testProductionAPIs() {
    console.log('🚀 Comprehensive Production API Test\n');
    console.log('=' .repeat(60));
    
    // Test 1: Backend Health
    console.log('🔍 Test 1: Backend Health Check');
    try {
        const healthData = await makeRequest('https://myerp-backend.onrender.com/api/health');
        console.log('✅ Backend Health:', JSON.stringify(healthData, null, 2));
    } catch (error) {
        console.log('❌ Backend Health Failed:', error.message);
        return;
    }
    
    // Test 2: Hospitals Endpoint
    console.log('\n🔍 Test 2: Hospitals Endpoint');
    try {
        const hospitalsData = await makeRequest('https://myerp-backend.onrender.com/api/hospitals');
        console.log(`✅ Hospitals Endpoint: Found ${hospitalsData.length} hospitals`);
        
        if (hospitalsData.length > 0) {
            const firstHospital = hospitalsData[0];
            console.log(`   Using Hospital: ${firstHospital.name || 'Unknown'} (${firstHospital._id})`);
            
            // Test 3: Expense Type Assignment Options
            console.log('\n🔍 Test 3: Expense Type Assignment Options');
            try {
                const optionsData = await makeRequest(`https://myerp-backend.onrender.com/api/expense-type-assignments/options/${firstHospital._id}`);
                console.log('✅ Expense Assignment Options:', JSON.stringify(optionsData, null, 2));
                
                console.log('\n🎉 ALL BACKEND TESTS PASSED!');
                console.log('🔧 Issue is likely in frontend deployment or browser caching');
                
            } catch (error) {
                console.log('❌ Expense Assignment Options Failed:', error.message);
            }
        }
    } catch (error) {
        console.log('❌ Hospitals Endpoint Failed:', error.message);
    }
    
    // Test 4: Frontend Accessibility
    console.log('\n🔍 Test 4: Frontend Accessibility');
    try {
        const frontendData = await makeRequest('https://my-erp.onrender.com', false);
        console.log('✅ Frontend is accessible (Status 200)');
        
        // Check if it's the latest build
        const buildTime = new Date().toISOString();
        console.log(`📅 Test Time: ${buildTime}`);
        
    } catch (error) {
        console.log('❌ Frontend Accessibility Failed:', error.message);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 TROUBLESHOOTING RECOMMENDATIONS:');
    console.log('');
    console.log('1. 🔄 CLEAR BROWSER CACHE:');
    console.log('   - Open Developer Tools (F12)');
    console.log('   - Right-click refresh button → "Empty Cache and Hard Reload"');
    console.log('');
    console.log('2. 🚀 VERIFY DEPLOYMENT:');
    console.log('   - Check Render dashboard for latest deployment');
    console.log('   - Ensure deployment uses main branch');
    console.log('');
    console.log('3. 🔍 CHECK NETWORK TAB:');
    console.log('   - Open F12 → Network tab');
    console.log('   - Try expense assignment feature');
    console.log('   - Look for failed API calls with wrong URL');
    console.log('');
    console.log('4. 📱 TEST IN INCOGNITO MODE:');
    console.log('   - Open incognito/private window');
    console.log('   - Test the feature to bypass cache');
}

function makeRequest(url, parseJson = true) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    if (parseJson) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            resolve(data);
                        }
                    } else {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

testProductionAPIs();
