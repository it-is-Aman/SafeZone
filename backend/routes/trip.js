const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Trip = require('../models/Trip');
const { sendEmail } = require('../config/email');

// Start a new trip
router.post('/start', auth, async (req, res) => {
  try {
    const {
      startLocation,
      endLocation,
      expectedEndTime
    } = req.body;

    const trip = new Trip({
      user: req.user._id,
      startLocation,
      endLocation,
      expectedEndTime: new Date(expectedEndTime)
    });

    await trip.save();

    // Notify emergency contacts about trip start
    for (const contact of req.user.emergencyContacts) {
      const emailHtml = `
        <h2>Trip Monitoring Alert</h2>
        <p>${req.user.name} has started a trip.</p>
        <p>Start Location: https://www.openstreetmap.org/?mlat=${startLocation.latitude}&mlon=${startLocation.longitude}</p>
        <p>Destination: https://www.openstreetmap.org/?mlat=${endLocation.latitude}&mlon=${endLocation.longitude}</p>
        <p>Expected Arrival: ${new Date(expectedEndTime).toLocaleString()}</p>
      `;

      await sendEmail(contact.email, 'Trip Started - SafeZone Monitoring', emailHtml);
    }

    res.status(201).json({
      message: 'Trip started successfully',
      trip
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ message: 'Error starting trip', error: error.message });
  }
});

// Update trip location
router.patch('/update-location/:id', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const trip = await Trip.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'ongoing'
    });

    if (!trip) {
      return res.status(404).json({ message: 'Active trip not found' });
    }

    trip.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date()
    };

    // Check if trip is delayed
    if (new Date() > trip.expectedEndTime) {
      trip.status = 'delayed';
      trip.alerts.push({
        type: 'delay',
        timestamp: new Date(),
        message: 'Trip has exceeded expected duration'
      });

      // Notify contacts about delay
      for (const contact of req.user.emergencyContacts) {
        const emailHtml = `
          <h2>Trip Delay Alert</h2>
          <p>${req.user.name}'s trip has been delayed.</p>
          <p>Current Location: https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}</p>
          <p>Expected Arrival Was: ${trip.expectedEndTime.toLocaleString()}</p>
        `;

        await sendEmail(contact.email, 'Trip Delay Alert - SafeZone', emailHtml);
      }
    }

    await trip.save();
    res.json({ message: 'Location updated', trip });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
});

// Complete trip
router.patch('/complete/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'completed';
    trip.actualEndTime = new Date();
    await trip.save();

    // Notify contacts about trip completion
    for (const contact of req.user.emergencyContacts) {
      const emailHtml = `
        <h2>Trip Completed</h2>
        <p>${req.user.name} has completed their trip safely.</p>
        <p>Arrival Time: ${trip.actualEndTime.toLocaleString()}</p>
      `;

      await sendEmail(contact.email, 'Trip Completed - SafeZone', emailHtml);
    }

    res.json({ message: 'Trip completed', trip });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({ message: 'Error completing trip', error: error.message });
  }
});

// Get active trip
router.get('/active', auth, async (req, res) => {
  try {
    const activeTrip = await Trip.findOne({
      user: req.user._id,
      status: { $in: ['ongoing', 'delayed'] }
    });

    res.json(activeTrip);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active trip', error: error.message });
  }
});

module.exports = router; 