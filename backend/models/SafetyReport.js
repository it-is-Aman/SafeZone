const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  category: { 
    type: String, 
    required: true,
    enum: ['harassment', 'darkArea', 'unsafeZone', 'other']
  },
  description: { type: String },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  verifiedReports: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  reportedAt: { type: Date, default: Date.now }
});

// Index for geospatial queries
ReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafetyReport', ReportSchema); 