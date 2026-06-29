'use strict';

const express     = require('express');
const router      = express.Router();
const User        = require('../model/User');
const Transaction = require('../model/Transaction');
const Investment  = require('../model/Investment');
const Settings    = require('../model/Settings');
const auth        = require('../middleware/auth');

/* ── Admin guard ── */
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required.' });
  next();
}

const guard = [auth, adminOnly];

/* ════════════════════════════════════════
   USERS
════════════════════════════════════════ */

// GET all users
router.get('/users', ...guard, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single user
router.get('/users/:id', ...guard, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH update user (balance, roi, plan, role, status etc.)
router.patch('/users/:id', ...guard, async (req, res) => {
  try {
    const allowed = ['balance', 'roi', 'plan', 'role', 'isVerified', 'phone', 'country', 'status'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User updated.', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH suspend user
router.patch('/users/:id/suspend', ...guard, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { isVerified: false, role: 'user' } }, { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User suspended.', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH activate user
router.patch('/users/:id/activate', ...guard, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { isVerified: true } }, { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User activated.', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE user
router.delete('/users/:id', ...guard, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ════════════════════════════════════════
   TRANSACTIONS
════════════════════════════════════════ */

// GET all transactions (with optional filters)
router.get('/transactions', ...guard, async (req, res) => {
  try {
    const { status, type, userId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (userId) filter.user   = userId;

    const transactions = await Transaction.find(filter)
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ transactions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH update transaction status (approve/reject/hold)
router.patch('/transactions/:id/status', ...guard, async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ['pending', 'approved', 'rejected', 'on-hold', 'completed', 'failed'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status.' });

    const tx = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: { status, note: note || '', reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true }
    ).populate('user', 'fullName email');

    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: `Transaction ${status}.`, transaction: tx });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ════════════════════════════════════════
   INVESTMENTS
════════════════════════════════════════ */

// GET all investments
router.get('/investments', ...guard, async (req, res) => {
  try {
    const investments = await Investment.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ investments });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH investment status
router.patch('/investments/:id', ...guard, async (req, res) => {
  try {
    const { status, profit } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (profit !== undefined) updates.profit = profit;

    const inv = await Investment.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true }
    ).populate('user', 'fullName email');

    if (!inv) return res.status(404).json({ message: 'Investment not found.' });
    res.json({ message: 'Investment updated.', investment: inv });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ════════════════════════════════════════
   STATS / DASHBOARD
════════════════════════════════════════ */

router.get('/stats', ...guard, async (req, res) => {
  try {
    const [totalUsers, verifiedUsers, balAgg, txAgg, pendingTx, activeInv] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.aggregate([{ $group: { _id: null, totalBalance: { $sum: '$balance' }, totalRoi: { $sum: '$roi' } } }]),
      Transaction.aggregate([
        { $match: { status: { $in: ['approved', 'completed'] } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      Transaction.countDocuments({ status: 'pending' }),
      Investment.countDocuments({ status: 'active' })
    ]);

    const bal = balAgg[0] || { totalBalance: 0, totalRoi: 0 };
    const txMap = {};
    txAgg.forEach(t => { txMap[t._id] = t.total; });

    res.json({
      totalUsers,
      verifiedUsers,
      totalBalance:   bal.totalBalance,
      totalRoi:       bal.totalRoi,
      totalDeposits:  txMap.deposit    || 0,
      totalWithdrawals: txMap.withdrawal || 0,
      pendingTransactions: pendingTx,
      activeInvestments:   activeInv
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ════════════════════════════════════════
   SETTINGS
════════════════════════════════════════ */

// GET settings
router.get('/settings', ...guard, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ settings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update settings
router.put('/settings', ...guard, async (req, res) => {
  try {
    const allowed = [
      'depositFeePercent', 'withdrawalFeePercent',
      'minWithdrawal', 'maxWithdrawal', 'minDeposit',
      'supportedCurrencies', 'maintenanceMode'
    ];
    const updates = { updatedAt: new Date() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const settings = await Settings.findOneAndUpdate(
      {}, { $set: updates }, { new: true, upsert: true }
    );
    res.json({ message: 'Settings updated.', settings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;