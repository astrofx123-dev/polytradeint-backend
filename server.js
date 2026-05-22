const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const marketRoutes = require('./routes/market');
const transactionRoutes = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => res.json({ status: 'PolyTrade API running ✅' }));

app.use(errorHandler);

connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT} ✅`)
  );
}).catch(err => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});