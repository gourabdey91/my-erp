// Test script to verify the fixes
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const MaterialMaster = require('./models/MaterialMaster');
const Hospital = require('./models/Hospital');

async function testFixes() {
  try {
    console.log('Connecting to database...');
    const mongoUri = process.env.MONGO_URI;
    console.log('Using MongoDB URI:', mongoUri ? 'URI found' : 'URI not found');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Test 1: Check for inactive materials
    console.log('\n=== TEST 1: Checking inactive materials ===');
    const inactiveMaterials = await MaterialMaster.find({ isActive: false });
    console.log(`Found ${inactiveMaterials.length} inactive materials:`);
    inactiveMaterials.forEach(material => {
      console.log(`- ${material.materialNumber}: ${material.description}`);
    });

    // Test 2: Check for duplicate material assignments
    console.log('\n=== TEST 2: Checking duplicate material assignments ===');
    const hospitals = await Hospital.find({
      materialAssignments: { $exists: true, $not: { $size: 0 } }
    });
    
    let totalDuplicates = 0;
    hospitals.forEach(hospital => {
      const materialMap = new Map();
      let duplicatesInHospital = 0;
      
      hospital.materialAssignments.forEach(assignment => {
        const materialId = assignment.material.toString();
        
        if (!materialMap.has(materialId)) {
          materialMap.set(materialId, []);
        }
        materialMap.get(materialId).push(assignment);
      });
      
      for (const [materialId, assignments] of materialMap) {
        if (assignments.length > 1) {
          duplicatesInHospital += assignments.length - 1;
          console.log(`Hospital ${hospital.shortName}: Material ${materialId} has ${assignments.length} assignments`);
          assignments.forEach((assign, index) => {
            console.log(`  Assignment ${index + 1}: isActive=${assign.isActive}, assignedAt=${assign.assignedAt}`);
          });
        }
      }
      
      totalDuplicates += duplicatesInHospital;
    });
    
    console.log(`Total duplicate assignments found: ${totalDuplicates}`);

    // Test 3: Test material number uniqueness issue
    console.log('\n=== TEST 3: Material number uniqueness ===');
    const allMaterials = await MaterialMaster.find({});
    const materialNumbers = new Map();
    
    allMaterials.forEach(material => {
      if (!materialNumbers.has(material.materialNumber)) {
        materialNumbers.set(material.materialNumber, []);
      }
      materialNumbers.get(material.materialNumber).push({
        id: material._id,
        isActive: material.isActive,
        description: material.description
      });
    });
    
    let duplicateMaterialNumbers = 0;
    for (const [materialNumber, materials] of materialNumbers) {
      if (materials.length > 1) {
        duplicateMaterialNumbers++;
        console.log(`Material Number ${materialNumber} has ${materials.length} entries:`);
        materials.forEach(mat => {
          console.log(`  ID: ${mat.id}, Active: ${mat.isActive}, Desc: ${mat.description}`);
        });
      }
    }
    
    console.log(`Total duplicate material numbers found: ${duplicateMaterialNumbers}`);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
testFixes();
