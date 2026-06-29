const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['deposit', 'withdrawal', 'trade', 'transfer'], required: true },
  amount:    { type: Number, required: true },
  asset:     { type: String, default: 'USD' },
  status:    { type: String, enum: ['pending', 'completed', 'failed', 'approved', 'rejected', 'on-hold'], default: 'pending' },
  note:      { type: String, default: '' },
  reference: { type: String, default: '' },
  reviewedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:{ type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);