require('dotenv').config();
const passport = require('passport');
require('./config/passport')(passport);
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const referralRoutes = require('./routes/referralRoutes');
const lotteryRoutes = require('./routes/lotteryRoutes');
const clubAvalancheRoutes = require('./routes/clubAvalancheRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const starsRoutes = require('./routes/starsRoutes');
const messengerRoutes = require('./routes/messengerRoutes');
const { startAllSchedulers } = require("./scheduler");
const superAdminRoutes = require('./routes/superAdmin');
const vectorDestinyRoutes = require('./routes/vectorDestiny');
const walletRoutes = require('./routes/walletRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const activationRoutes = require('./routes/activationRoutes');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Logging (БЕЗ express.json() пока!)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));

// ВАЖНО: Stripe webhook ПЕРЕД express.json() (нужен raw body!)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);

// Теперь можно использовать express.json() для остальных роутов
app.use(express.json());
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));

// Passport middleware
app.use(passport.initialize());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/club-avalanche', clubAvalancheRoutes);
app.use('/api/challenge', challengeRoutes);
app.use('/api/stars', starsRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/vector', vectorDestinyRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/activation', activationRoutes);
app.use('/api/upload', uploadRoutes);

// Запустить Unified Scheduler
startAllSchedulers();

// Vector Destiny Billing Scheduler
const { startBillingScheduler } = require('./services/vectorDestiny/billingScheduler');
startBillingScheduler();

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║        🚀 Bruno Token API Server          ║
║        Port: ${PORT}                           ║
║        URL: http://localhost:${PORT}           ║
║        Environment: ${process.env.NODE_ENV || 'development'}               ║
╚════════════════════════════════════════════╝
  `);
});

module.exports = app;