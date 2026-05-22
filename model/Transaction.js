const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['deposit', 'withdrawal', 'trade'], required: true },
  amount:    { type: Number, required: true },
  asset:     { type: String },
  status:    { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  note:      { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);