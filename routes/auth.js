const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const User       = require('../model/User');
const { authLimiter } = require('../middleware/rateLimiter');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

function publicUser(user) {
  const nameParts = (user.fullName || '').trim().split(' ');
  const firstName = user.firstName || nameParts[0] || '';
  const lastName  = user.lastName  || nameParts.slice(1).join(' ') || '';
  const initials  = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'U';
  return {
    id:         user._id,
    fullName:   user.fullName,
    firstName,
    lastName,
    initials,
    username:   user.username  || '',
    email:      user.email,
    phone:      user.phone     || '',
    country:    user.country   || '',
    plan:       user.plan      || 'CryptoBot Plan',
    currency:   user.currency  || 'USD',
    balance:    user.balance   || 0,
    roi:        user.roi       || 0,
    isVerified: user.isVerified,
    role:       user.role,
    joinedDate: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };
}

// ── OTP store ───────────────────────────────────────────────────
const otpStore = new Map();

// ── Email transporter ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function otpEmailHTML(otp, email) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{margin:0;padding:0;background:#090d13;font-family:Arial,sans-serif;}
    .wrap{max-width:520px;margin:40px auto;background:#0e1420;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;}
    .header{background:linear-gradient(135deg,#00e676,#00c853);padding:32px;text-align:center;}
    .header h1{margin:0;color:#000;font-size:1.4rem;font-weight:800;}
    .body{padding:36px 40px;}
    .body p{color:rgba(255,255,255,0.7);font-size:0.93rem;line-height:1.6;margin:0 0 20px;}
    .otp-box{background:rgba(0,230,118,0.08);border:1px solid rgba(0,230,118,0.25);border-radius:12px;padding:24px;text-align:center;margin:24px 0;}
    .otp-code{font-size:2.4rem;font-weight:700;letter-spacing:0.25em;color:#00e676;font-family:'Courier New',monospace;}
    .otp-exp{color:rgba(255,255,255,0.35);font-size:0.78rem;margin-top:8px;}
    .footer{padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;}
    .footer p{color:rgba(255,255,255,0.25);font-size:0.75rem;margin:0;}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>PolyTradeCentral</h1></div>
    <div class="body">
      <p>Hi there,</p>
      <p>We received a request to reset the password for <strong style="color:#fff">${email}</strong>. Use the code below:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-exp">Expires in 10 minutes · Do not share this code</div>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} PolyTradeCentral. All rights reserved.</p></div>
  </div></body></html>`;
}

// ── REGISTER ────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const {
      fullName, firstName, lastName, username,
      email, password, phone, country, plan, currency,
    } = req.body;

    if (!fullName || !email || !password)
      return res.status(400).json({ message: 'Full name, email and password are required.' });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already registered.' });

    if (username && await User.findOne({ username }))
      return res.status(400).json({ message: 'Username already taken.' });

    const user = await User.create({
      fullName,
      firstName: firstName || fullName.split(' ')[0],
      lastName:  lastName  || fullName.split(' ').slice(1).join(' '),
      username:  username  || undefined,
      email,
      password,
      phone:    phone    || '',
      country:  country  || '',
      plan:     plan     || 'CryptoBot Plan',
      currency: currency || 'USD',
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('REGISTER ERROR:', err.message, err.stack);
    res.status(500).json({ message: err.message });
  }
});

// ── LOGIN ────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password.' });

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message, err.stack);
    res.status(500).json({ message: err.message });
  }
});

// ── ME ───────────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ── FORGOT PASSWORD ──────────────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Please provide a valid email address.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });

    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });

    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || 'PolyTradeCentral <no-reply@polytradecentral.com>',
      to:      email,
      subject: `${otp} is your PolyTradeCentral reset code`,
      html:    otpEmailHTML(otp, email),
    });

    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to send reset code. Please try again.' });
  }
});

// ── VERIFY OTP ───────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required.' });

    const record = otpStore.get(email.toLowerCase());
    if (!record)
      return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }
    if (record.otp !== String(otp).trim())
      return res.status(400).json({ message: 'Invalid reset code. Please check and try again.' });

    record.verified = true;
    otpStore.set(email.toLowerCase(), record);
    res.json({ message: 'Code verified successfully.' });
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err.message, err.stack);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

// ── RESET PASSWORD ───────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password)
      return res.status(400).json({ message: 'All fields are required.' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const record = otpStore.get(email.toLowerCase());
    if (!record || !record.verified)
      return res.status(400).json({ message: 'Please verify your reset code first.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'Reset session expired. Please start over.' });
    }
    if (record.otp !== String(otp).trim())
      return res.status(400).json({ message: 'Invalid reset code.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    user.password = password;
    await user.save();
    otpStore.delete(email.toLowerCase());

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err.message, err.stack);
    res.status(500).json({ message: 'Password reset failed. Please try again.' });
  }
});

module.exports = router;