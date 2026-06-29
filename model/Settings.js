const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  depositFeePercent:    { type: Number, default: 0 },
  withdrawalFeePercent: { type: Number, default: 2.5 },
  minWithdrawal:        { type: Number, default: 50 },
  maxWithdrawal:        { type: Number, default: 50000 },
  minDeposit:           { type: Number, default: 100 },
  supportedCurrencies:  { type: [String], default: ['USD', 'EUR', 'GBP', 'BTC', 'ETH'] },
  maintenanceMode:      { type: Boolean, default: false },
  updatedAt:            { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);