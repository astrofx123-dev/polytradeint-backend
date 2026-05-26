const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const connectDB          = require('./config/db');
const authRoutes         = require('./routes/auth');
const portfolioRoutes    = require('./routes/portfolio');
const marketRoutes       = require('./routes/market');
const transactionRoutes  = require('./routes/transactions');
const errorHandler       = require('./middleware/errorHandler');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:5502',
  'http://localhost:5503',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5502',
  'http://127.0.0.1:5503',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed — ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// ── ROUTES ───────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/market',       marketRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => res.json({ status: 'PolyTrade API running ✅' }));

app.use(errorHandler);

// ── START ─────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT || 5000} ✅`)
  );
}).catch(err => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});