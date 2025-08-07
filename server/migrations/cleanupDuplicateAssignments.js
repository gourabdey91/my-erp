const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Hospital = require('../models/Hospital');
const MaterialMaster = require('../models/MaterialMaster');

async function cleanupDuplicateAssignments() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://gourabdey91:Gourab123@main-cluster.svki2gf.mongodb.net/myerp-dev');
    console.log('Connected to MongoDB');

    // Find all hospitals with material assignments
    const hospitals = await Hospital.find({
      materialAssignments: { $exists: true, $not: { $size: 0 } }
    });

    console.log(`Found ${hospitals.length} hospitals with material assignments`);

    let totalCleaned = 0;
    
    for (const hospital of hospitals) {
      let cleaned = 0;
      const materialMap = new Map();
      const cleanAssignments = [];
      
      // Group assignments by material ID
      for (const assignment of hospital.materialAssignments) {
        const materialId = assignment.material.toString();
        
        if (!materialMap.has(materialId)) {
          materialMap.set(materialId, []);
        }
        materialMap.get(materialId).push(assignment);
      }
      
      // For each material, keep only one assignment (prefer active ones)
      for (const [materialId, assignments] of materialMap) {
        if (assignments.length > 1) {
          console.log(`Hospital ${hospital.shortName}: Found ${assignments.length} assignments for material ${materialId}`);
          
          // Find active assignment or the most recent one
          const activeAssignment = assignments.find(a => a.isActive);
          const mostRecent = assignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0];
          
          const keepAssignment = activeAssignment || mostRecent;
          cleanAssignments.push(keepAssignment);
          cleaned += assignments.length - 1;
        } else {
          cleanAssignments.push(assignments[0]);
        }
      }
      
      if (cleaned > 0) {
        hospital.materialAssignments = cleanAssignments;
        await hospital.save();
        totalCleaned += cleaned;
        console.log(`Hospital ${hospital.shortName}: Removed ${cleaned} duplicate assignments`);
      }
    }

    console.log(`\nCleanup completed! Removed ${totalCleaned} duplicate assignments total.`);

    // Clean up inactive materials that might cause unique constraint issues
    const inactiveMaterials = await MaterialMaster.find({ isActive: false });
    console.log(`Found ${inactiveMaterials.length} inactive materials`);

    // Check for duplicates in material numbers
    const activeMaterials = await MaterialMaster.find({ isActive: true });
    const activeMaterialNumbers = activeMaterials.map(m => m.materialNumber);
    
    let materialsCleaned = 0;
    for (const inactiveMaterial of inactiveMaterials) {
      if (activeMaterialNumbers.includes(inactiveMaterial.materialNumber)) {
        console.log(`Found duplicate material number: ${inactiveMaterial.materialNumber} (inactive vs active)`);
        // Keep the inactive one as it might be reactivated later
        // The logic in routes will handle reactivation
      }
    }

    console.log('Database cleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the cleanup
cleanupDuplicateAssignments();
