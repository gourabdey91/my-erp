// Quick cleanup script for the one duplicate found
const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./models/Hospital');

async function cleanupSpecificDuplicate() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the specific hospital with the duplicate
    const hospital = await Hospital.findOne({ shortName: 'CARE' });
    if (!hospital) {
      console.log('Hospital CARE not found');
      return;
    }

    console.log('Before cleanup:', hospital.materialAssignments.length, 'assignments');
    
    // Find the duplicate material assignments
    const materialId = '6894d44fb2c9fb37eda12db6';
    const assignments = hospital.materialAssignments.filter(
      assignment => assignment.material.toString() === materialId
    );
    
    console.log(`Found ${assignments.length} assignments for material ${materialId}`);
    
    if (assignments.length > 1) {
      // Keep only the active one or the most recent one
      const activeAssignment = assignments.find(a => a.isActive);
      const mostRecent = assignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0];
      
      const keepAssignment = activeAssignment || mostRecent;
      console.log('Keeping assignment:', keepAssignment._id, 'isActive:', keepAssignment.isActive);
      
      // Remove all others
      hospital.materialAssignments = hospital.materialAssignments.filter(
        assignment => {
          if (assignment.material.toString() === materialId) {
            return assignment._id.toString() === keepAssignment._id.toString();
          }
          return true;
        }
      );
      
      await hospital.save();
      console.log('After cleanup:', hospital.materialAssignments.length, 'assignments');
      console.log('Cleanup completed successfully!');
    } else {
      console.log('No duplicates to clean up');
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

cleanupSpecificDuplicate();
