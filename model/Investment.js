const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:      { type: String, required: true },
  capital:   { type: Number, required: true },
  roi:       { type: Number, required: true },
  duration:  { type: Number, required: true },   // days
  status:    { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate:   { type: Date },
  profit:    { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Auto-calculate endDate before saving
investmentSchema.pre('save', function(next) {
  if (!this.endDate) {
    this.endDate = new Date(this.startDate.getTime() + this.duration * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Investment', investmentSchema);