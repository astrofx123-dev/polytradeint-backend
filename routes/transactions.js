'use strict';

const express     = require('express');
const router      = express.Router();
const Transaction = require('../model/Transaction');
const auth        = require('../middleware/auth');

/* POST /api/transactions — user submits a deposit or withdrawal */
router.post('/', auth, async (req, res) => {
  try {
    const { type, amount, asset, note, reference, status } = req.body;

    const allowed = ['deposit', 'withdrawal', 'trade', 'transfer'];
    if (!allowed.includes(type))
      return res.status(400).json({ message: 'Invalid transaction type.' });

    if (!amount || isNaN(amount) || +amount <= 0)
      return res.status(400).json({ message: 'Invalid amount.' });

    const tx = await Transaction.create({
      user:      req.user._id,
      type,
      amount:    +amount,
      asset:     asset || 'USD',
      note:      note  || '',
      reference: reference || '',
      status:    status || 'pending',
    });

    res.status(201).json({ message: 'Transaction submitted.', transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* GET /api/transactions — user sees their own transactions */
router.get('/', auth, async (req, res) => {
  try {
    const txs = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ transactions: txs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
