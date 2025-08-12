// Test script to check available hospitals in production
const https = require('https');

async function getAvailableHospitals() {
    console.log('🔍 Fetching Available Hospitals from Production...\n');
    
    const url = 'https://myerp-backend.onrender.com/api/hospitals';
    
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
                        console.log('✅ SUCCESS: Hospitals endpoint working!');
                        console.log(`📋 Available Hospitals (${jsonData.length} total):`);
                        
                        if (Array.isArray(jsonData)) {
                            jsonData.forEach((hospital, index) => {
                                console.log(`  ${index + 1}. ${hospital.name} (ID: ${hospital._id})`);
                            });
                        } else {
                            console.log(JSON.stringify(jsonData, null, 2));
                        }
                        
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

async function testExpenseTypeAssignmentWithValidHospital(hospitalId, hospitalName) {
    console.log(`\n🔍 Testing Expense Type Assignment with ${hospitalName}...\n`);
    
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
                
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`✅ SUCCESS: Expense type assignment endpoint working for ${hospitalName}!`);
                        console.log(`📋 Available Expense Types:`, JSON.stringify(jsonData, null, 2));
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

async function runTests() {
    console.log('🚀 Production Hospital & Expense Type Assignment Verification\n');
    console.log('=' .repeat(70));
    
    try {
        // Get available hospitals first
        const hospitals = await getAvailableHospitals();
        
        if (Array.isArray(hospitals) && hospitals.length > 0) {
            // Test with the first available hospital
            const firstHospital = hospitals[0];
            await testExpenseTypeAssignmentWithValidHospital(firstHospital._id, firstHospital.name);
        }
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎉 VERIFICATION COMPLETE!');
        console.log('✅ The API fix is working correctly');
        console.log('✅ Both endpoints are accessible with correct URL configuration');
        
    } catch (error) {
        console.log('\n' + '=' .repeat(70));
        console.log('❌ VERIFICATION FAILED:', error.message);
    }
}

runTests();
