const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      emergencyContacts: []
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emergencyContacts: user.emergencyContacts
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering user', 
      error: error.message 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emergencyContacts: user.emergencyContacts
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error logging in', 
      error: error.message 
    });
  }
});

// Get emergency contacts
router.get('/emergency-contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ emergencyContacts: user.emergencyContacts });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching emergency contacts', 
      error: error.message 
    });
  }
});

// Add emergency contact
router.post('/add-emergency-contact', auth, async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    // Validate input
    if (!name || !phone || !email) {
      return res.status(400).json({ message: 'Please provide all contact details' });
    }

    const user = await User.findById(req.user._id);
    user.emergencyContacts.push({ name, phone, email });
    await user.save();

    res.json({ 
      message: 'Emergency contact added successfully',
      emergencyContacts: user.emergencyContacts 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding emergency contact', 
      error: error.message 
    });
  }
});

// Remove emergency contact
router.delete('/remove-emergency-contact/:contactId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.emergencyContacts = user.emergencyContacts.filter(
      contact => contact._id.toString() !== req.params.contactId
    );
    await user.save();

    res.json({ 
      message: 'Emergency contact removed successfully',
      emergencyContacts: user.emergencyContacts 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error removing emergency contact', 
      error: error.message 
    });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching user profile', 
      error: error.message 
    });
  }
});

// Add this route to check emergency contacts
router.get('/user/emergency-contact', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      emergencyContacts: user.emergencyContacts
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching emergency contacts' 
    });
  }
});

module.exports = router; 