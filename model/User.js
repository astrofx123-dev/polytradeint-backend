const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName:  { type: String, required: true, trim: true },
  firstName: { type: String, trim: true },
  lastName:  { type: String, trim: true },
  username:  { type: String, unique: true, sparse: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 8, select: false },
  phone:     { type: String, default: '' },
  country:   { type: String, default: '' },
  plan:      { type: String, default: 'CryptoBot Plan' },
  currency:  { type: String, default: 'USD' },
  balance:   { type: Number, default: 0 },
  roi:       { type: Number, default: 0 },
  isVerified:{ type: Boolean, default: false },
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// ── Fix: don't use next() with async pre-save in Mongoose 7+ ──
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.correctPassword = async function(candidate, hashed) {
  return bcrypt.compare(candidate, hashed);
};

module.exports = mongoose.model('User', userSchema);