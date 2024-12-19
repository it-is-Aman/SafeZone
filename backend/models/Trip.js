const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  endLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    lastUpdated: { type: Date }
  },
  startTime: { type: Date, default: Date.now },
  expectedEndTime: { type: Date, required: true },
  actualEndTime: { type: Date },
  status: { 
    type: String, 
    enum: ['ongoing', 'completed', 'delayed', 'alerted', 'cancelled'],
    default: 'ongoing'
  },
  alerts: [{
    type: { type: String, enum: ['delay', 'deviation', 'sos'] },
    timestamp: { type: Date },
    message: String
  }]
});

module.exports = mongoose.model('Trip', TripSchema); 