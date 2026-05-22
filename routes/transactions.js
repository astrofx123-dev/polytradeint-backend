const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../model/Transaction');
const User = require('../model/User');

router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { balance: amount } });
    const tx = await Transaction.create({ user: req.user._id, type: 'deposit', amount, status: 'completed' });
    res.status(201).json({ message: 'Deposit successful', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user._id);
    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
    await User.findByIdAndUpdate(req.user._id, { $inc: { balance: -amount } });
    const tx = await Transaction.create({ user: req.user._id, type: 'withdrawal', amount, status: 'completed' });
    res.status(201).json({ message: 'Withdrawal successful', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort('-createdAt');
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;