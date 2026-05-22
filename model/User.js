const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 8, select: false },
  isVerified:   { type: Boolean, default: false },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  balance:      { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function(candidate, hashed) {
  return await bcrypt.compare(candidate, hashed);
};

module.exports = mongoose.model('User', userSchema);