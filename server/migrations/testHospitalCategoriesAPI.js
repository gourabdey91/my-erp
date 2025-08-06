const axios = require('axios');

async function testHospitalCategoriesAPI() {
  try {
    const businessUnitId = '68920a453993bf82a0512c02';
    console.log('Testing categories API endpoint...');
    console.log(`URL: http://localhost:5000/api/hospitals/categories/${businessUnitId}`);
    
    const response = await axios.get(`http://localhost:5000/api/hospitals/categories/${businessUnitId}`);
    console.log('✅ Categories API response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.length === 0) {
      console.log('⚠️ No categories returned from API');
    } else {
      console.log(`✅ Found ${response.data.length} categories`);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testHospitalCategoriesAPI();
