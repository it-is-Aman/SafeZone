const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SafetyReport = require('../models/SafetyReport');

// Submit a new safety report
router.post('/submit', auth, async (req, res) => {
  try {
    const { latitude, longitude, category, description, severity } = req.body;

    const report = new SafetyReport({
      user: req.user._id,
      location: { latitude, longitude },
      category,
      description,
      severity
    });

    await report.save();

    res.status(201).json({
      message: 'Safety report submitted successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting report', error: error.message });
  }
});

// Get nearby safety reports
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query; // radius in meters

    const reports = await SafetyReport.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      },
      active: true
    }).populate('user', 'name');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching nearby reports', error: error.message });
  }
});

// Verify an existing report
router.patch('/verify/:id', auth, async (req, res) => {
  try {
    const report = await SafetyReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Increment verification count
    report.verifiedReports += 1;
    await report.save();

    res.json({
      message: 'Report verified successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying report', error: error.message });
  }
});

// Get reports by category
router.get('/category/:category', async (req, res) => {
  try {
    const reports = await SafetyReport.find({
      category: req.params.category,
      active: true
    }).populate('user', 'name');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

// Get user's submitted reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const reports = await SafetyReport.find({
      user: req.user._id
    }).sort({ reportedAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your reports', error: error.message });
  }
});

module.exports = router; 