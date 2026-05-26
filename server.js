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

// ── CORS ────────────────────────────────────────────────────────
// Allowed origins: add every URL you develop or deploy from.
// On Render, set CLIENT_URL=https://your-site.netlify.app
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,          // your Netlify production URL (set in Render env vars)
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:5502',
  'http://localhost:5503',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5502',
  'http://127.0.0.1:5503',
].filter(Boolean); // removes undefined if CLIENT_URL isn't set

app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed — ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests for all routes
app.options('*', cors());

app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// ── ROUTES ──────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/market',       marketRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => res.json({ status: 'PolyTrade API running ✅' }));

app.use(errorHandler);

// ── START ────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port ${process.env.PORT || 5000} ✅`)
  );
}).catch(err => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});