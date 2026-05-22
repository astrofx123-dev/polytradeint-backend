const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Portfolio = require('../model/Portfolio');

router.get('/', auth, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user._id });
    if (!portfolio) portfolio = await Portfolio.create({ user: req.user._id, holdings: [] });
    res.json({ portfolio });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;