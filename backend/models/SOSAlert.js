const mongoose = require('mongoose');

const SOSSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  status: { 
    type: String, 
    enum: ['active', 'resolved'], 
    default: 'active' 
  },
  alertTime: { type: Date, default: Date.now },
  resolvedTime: { type: Date },
  notifiedContacts: [{
    contactId: String,
    notificationTime: Date,
    notificationType: { type: String, enum: ['email', 'sms'] }
  }]
});

module.exports = mongoose.model('SOSAlert', SOSSchema); 