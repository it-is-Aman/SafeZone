const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SOSAlert = require('../models/SOSAlert');
const User = require('../models/User');
const { sendEmail } = require('../config/email');

// Trigger SOS Alert
router.post('/trigger', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Get user with emergency contacts
    const user = await User.findById(req.user._id);
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts found. Please add emergency contacts first.'
      });
    }

    // Create SOS alert
    const sosAlert = new SOSAlert({
      user: user._id,
      location: { latitude, longitude }
    });

    // Send emails to emergency contacts
    const emailPromises = user.emergencyContacts.map(async (contact) => {
      try {
        console.log('Sending email to:', contact.email); // Debug log

        const emailHtml = `
          <h2>Emergency SOS Alert</h2>
          <p><strong>${user.name}</strong> has triggered an emergency alert!</p>
          <p><strong>Location:</strong> <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">Click here to view location on map</a></p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Contact Phone:</strong> ${contact.phone || 'Not provided'}</p>
          <p style="color: red; font-weight: bold;">Please contact them immediately!</p>
        `;

        const emailResult = await sendEmail(
          contact.email,
          '🚨 EMERGENCY SOS ALERT - Immediate Action Required',
          emailHtml
        );

        console.log('Email result:', emailResult); // Debug log

        return {
          contactId: contact._id,
          email: contact.email,
          success: true
        };
      } catch (error) {
        console.error(`Failed to send email to ${contact.email}:`, error);
        return {
          contactId: contact._id,
          email: contact.email,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for all email attempts
    const emailResults = await Promise.allSettled(emailPromises);
    
    // Save notification results to SOS alert
    sosAlert.notifiedContacts = emailResults.map(result => ({
      contactId: result.value?.contactId,
      notificationTime: new Date(),
      notificationType: 'email',
      status: result.value?.success ? 'sent' : 'failed'
    }));

    await sosAlert.save();

    // Check if any emails were sent successfully
    const successfulEmails = emailResults.filter(
      result => result.status === 'fulfilled' && result.value?.success
    ).length;

    if (successfulEmails === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send emergency alerts',
        sosAlert,
        emailResults: emailResults.map(result => result.value)
      });
    }

    res.status(201).json({
      success: true,
      message: `SOS alert triggered and sent to ${successfulEmails} contacts`,
      sosAlert,
      emailResults: emailResults.map(result => result.value)
    });

  } catch (error) {
    console.error('Error in SOS trigger:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering SOS alert',
      error: error.message
    });
  }
});

// Get active SOS alerts for user
router.get('/active', auth, async (req, res) => {
  try {
    const activeAlerts = await SOSAlert.find({
      user: req.user._id,
      status: 'active'
    }).sort({ alertTime: -1 });

    res.json(activeAlerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching SOS alerts', error: error.message });
  }
});

// Resolve SOS alert
router.patch('/resolve/:id', auth, async (req, res) => {
  try {
    const alert = await SOSAlert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.status = 'resolved';
    alert.resolvedTime = new Date();
    await alert.save();

    // Notify emergency contacts about resolution
    for (const contact of req.user.emergencyContacts) {
      const emailHtml = `
        <h2>SOS Alert Resolved</h2>
        <p>${req.user.name}'s emergency alert has been resolved.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `;

      await sendEmail(contact.email, 'SOS Alert Resolved', emailHtml);
    }

    res.json({ message: 'SOS alert resolved', alert });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving SOS alert', error: error.message });
  }
});

module.exports = router; 