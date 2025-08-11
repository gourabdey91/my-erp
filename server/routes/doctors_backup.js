const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Category = require('../models/Category');
const DoctorAssignment = require('../models/DoctorAssignment');

// Get all doctors with hospital information
router.get('/', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
    .populate('surgicalCategories', 'code description')
    .populate('consultingDoctor', 'name email')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ name: 1 });

    // Get hospital assignments for each doctor
    const doctorsWithHospitals = await Promise.all(
      doctors.map(async (doctor) => {
        const assignments = await DoctorAssignment.find({
          doctor: doctor._id,
          isActive: true,
          validityFrom: { $lte: new Date() },
          validityTo: { $gte: new Date() }
        })
        .populate('hospital', 'name code address');

        // Extract unique hospitals
        const uniqueHospitals = [];
        const hospitalIds = new Set();
        
        assignments.forEach(assignment => {
          if (assignment.hospital && !hospitalIds.has(assignment.hospital._id.toString())) {
            hospitalIds.add(assignment.hospital._id.toString());
            uniqueHospitals.push(assignment.hospital);
          }
        });

        return {
          ...doctor.toObject(),
          assignedHospitals: uniqueHospitals
        };
      })
    );

    res.json(doctorsWithHospitals);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error while fetching doctors' });
  }
});

// Get surgical categories for dropdown
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
    .select('_id code description').sort({ description: 1 });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Get hospitals for filtering (hospitals that have doctor assignments)
router.get('/hospitals', async (req, res) => {
  try {
    const assignments = await DoctorAssignment.find({
      isActive: true,
      validityFrom: { $lte: new Date() },
      validityTo: { $gte: new Date() }
    })
    .populate('hospital', 'name code address');

    // Extract unique hospitals
    const uniqueHospitals = [];
    const hospitalIds = new Set();
    
    assignments.forEach(assignment => {
      if (assignment.hospital && !hospitalIds.has(assignment.hospital._id.toString())) {
        hospitalIds.add(assignment.hospital._id.toString());
        uniqueHospitals.push(assignment.hospital);
      }
    });

    // Sort by name
    const hospitals = uniqueHospitals
      .filter(hospital => hospital && hospital.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ message: 'Server error while fetching hospitals' });
  }
});

// Get doctors by hospital filter
router.get('/by-hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    let doctors;
    
    if (hospitalId && hospitalId !== 'all') {
      // Get doctors assigned to specific hospital
      const doctorAssignments = await DoctorAssignment.find({
        hospital: hospitalId,
        isActive: true,
        validityFrom: { $lte: new Date() },
        validityTo: { $gte: new Date() }
      }).distinct('doctor');

      doctors = await Doctor.find({ 
        _id: { $in: doctorAssignments },
        isActive: true 
      })
      .populate('surgicalCategories', 'code description')
      .populate('consultingDoctor', 'name email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    } else {
      // Get all doctors (existing functionality)
      doctors = await Doctor.find({ isActive: true })
      .populate('surgicalCategories', 'code description')
      .populate('consultingDoctor', 'name email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    }

    // Get hospital assignments for each doctor
    const doctorsWithHospitals = await Promise.all(
      doctors.map(async (doctor) => {
        const assignments = await DoctorAssignment.find({
          doctor: doctor._id,
          isActive: true,
          validityFrom: { $lte: new Date() },
          validityTo: { $gte: new Date() }
        })
        .populate('hospital', 'name code address');

        // Extract unique hospitals
        const uniqueHospitals = [];
        const hospitalIds = new Set();
        
        assignments.forEach(assignment => {
          if (assignment.hospital && !hospitalIds.has(assignment.hospital._id.toString())) {
            hospitalIds.add(assignment.hospital._id.toString());
            uniqueHospitals.push(assignment.hospital);
          }
        });

        return {
          ...doctor.toObject(),
          assignedHospitals: uniqueHospitals
        };
      })
    );

    res.json(doctorsWithHospitals);
  } catch (error) {
    console.error('Error fetching doctors by hospital:', error);
    res.status(500).json({ message: 'Server error while fetching doctors by hospital' });
  }
});

// Get doctors by hospital filter (for 'all' case)
router.get('/by-hospital', async (req, res) => {
  try {
    // Get all doctors (existing functionality)
    const doctors = await Doctor.find({ isActive: true })
    .populate('surgicalCategories', 'code description')
    .populate('consultingDoctor', 'name email')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ name: 1 });

    // Get hospital assignments for each doctor
    const doctorsWithHospitals = await Promise.all(
      doctors.map(async (doctor) => {
        const assignments = await DoctorAssignment.find({
          doctor: doctor._id,
          isActive: true,
          validityFrom: { $lte: new Date() },
          validityTo: { $gte: new Date() }
        })
        .populate('hospital', 'name code address');

        // Extract unique hospitals
        const uniqueHospitals = [];
        const hospitalIds = new Set();
        
        assignments.forEach(assignment => {
          if (assignment.hospital && !hospitalIds.has(assignment.hospital._id.toString())) {
            hospitalIds.add(assignment.hospital._id.toString());
            uniqueHospitals.push(assignment.hospital);
          }
        });

        return {
          ...doctor.toObject(),
          assignedHospitals: uniqueHospitals
        };
      })
    );

    res.json(doctorsWithHospitals);
  } catch (error) {
    console.error('Error fetching all doctors:', error);
    res.status(500).json({ message: 'Server error while fetching doctors' });
  }
});

// Get doctors for dropdown (consulting doctor selection)
router.get('/dropdown', async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .select('_id name email')
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors for dropdown:', error);
    res.status(500).json({ message: 'Server error while fetching doctors' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('surgicalCategories', 'code description')
      .populate('consultingDoctor', 'name email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error while fetching doctor' });
  }
});

// Create new doctor
router.post('/', async (req, res) => {
  try {
    const { name, surgicalCategories, phoneNumber, email, consultingDoctor, createdBy } = req.body;

    // Validation
    if (!name || !surgicalCategories || !createdBy) {
      return res.status(400).json({ 
        message: 'Name, surgical categories, and created by are required' 
      });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 50 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number' 
      });
    }

    // Validate email format if provided
    if (email && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate consulting doctor exists if provided
    if (consultingDoctor) {
      const consultingDoctorExists = await Doctor.findById(consultingDoctor);
      if (!consultingDoctorExists) {
        return res.status(400).json({ 
          message: 'Consulting doctor not found' 
        });
      }
    }

    // Check if email already exists (only if email is provided)
    if (email) {
      const existingByEmail = await Doctor.findOne({ 
        email: email.toLowerCase().trim(),
        isActive: true 
      });

      if (existingByEmail) {
        return res.status(400).json({ 
          message: 'Doctor with this email already exists' 
        });
      }
    }

    // Verify surgical categories exist
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    const doctor = new Doctor({
      name: name.trim(),
      surgicalCategories,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      email: email ? email.toLowerCase().trim() : undefined,
      consultingDoctor: consultingDoctor || undefined,
      createdBy,
      updatedBy: createdBy
    });

    await doctor.save();
    
    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('surgicalCategories', 'code description')
      .populate('consultingDoctor', 'name email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedDoctor);
  } catch (error) {
    console.error('Error creating doctor:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'email' ? 
        'Doctor with this email already exists' : 
        'Doctor with this ID already exists';
      res.status(400).json({ message });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating doctor' });
    }
  }
});

// Update doctor
router.put('/:id', async (req, res) => {
  try {
    const { name, surgicalCategories, phoneNumber, email, consultingDoctor, updatedBy } = req.body;

    if (!name || !surgicalCategories || !updatedBy) {
      return res.status(400).json({ 
        message: 'Name, surgical categories, and updated by are required' 
      });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 50 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number' 
      });
    }

    // Validate email format if provided
    if (email && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate consulting doctor exists if provided
    if (consultingDoctor) {
      const consultingDoctorExists = await Doctor.findById(consultingDoctor);
      if (!consultingDoctorExists) {
        return res.status(400).json({ 
          message: 'Consulting doctor not found' 
        });
      }
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if email conflicts with another doctor (only if email is provided)
    if (email && email.toLowerCase().trim() !== doctor.email) {
      const existingByEmail = await Doctor.findOne({ 
        email: email.toLowerCase().trim(),
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByEmail) {
        return res.status(400).json({ 
          message: 'Doctor with this email already exists' 
        });
      }
    }

    // Verify surgical categories exist
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    doctor.name = name.trim();
    doctor.surgicalCategories = surgicalCategories;
    doctor.phoneNumber = phoneNumber ? phoneNumber.trim() : undefined;
    doctor.email = email ? email.toLowerCase().trim() : undefined;
    doctor.consultingDoctor = consultingDoctor || undefined;
    doctor.updatedBy = updatedBy;

    await doctor.save();

    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('surgicalCategories', 'code description')
      .populate('consultingDoctor', 'name email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedDoctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'email' ? 
        'Doctor with this email already exists' : 
        'Doctor with this ID already exists';
      res.status(400).json({ message });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating doctor' });
    }
  }
});

// Delete doctor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isActive = false;
    doctor.updatedBy = updatedBy;
    await doctor.save();

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Server error while deleting doctor' });
  }
});

module.exports = router;
