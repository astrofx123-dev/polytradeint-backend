const express = require('express');
const router = express.Router();
const axios = require('axios');
const { apiLimiter } = require('../middleware/rateLimiter');

router.get('/prices', apiLimiter, async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      { params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 20, page: 1 } }
    );
    res.json({ prices: data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch market data' });
  }
});

module.exports = router;