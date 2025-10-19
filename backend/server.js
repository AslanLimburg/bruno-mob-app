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
const challengeRoutes = require('./routes/challengeRoutes'); // ← ДОБАВЛЕНО
const starsRoutes = require('./routes/starsRoutes');
const messengerRoutes = require('./routes/messengerRoutes');
const { startAllSchedulers } = require("./scheduler");
const superAdminRoutes = require('./routes/superAdmin');
const vectorDestinyRoutes = require('./routes/vectorDestiny');
const walletRoutes = require('./routes/walletRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));
// Passport middleware
app.use(passport.initialize());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }); // Увеличили до 1000 для de
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/club-avalanche', clubAvalancheRoutes);
app.use('/api/challenge', challengeRoutes); // ← ДОБАВЛЕНО
app.use('/api/stars', starsRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/vector', vectorDestinyRoutes);
app.use('/api/wallet', walletRoutes);

// Запустить Unified Scheduler
startAllSchedulers();
// Vector Destiny Billing Scheduler
const { startBillingScheduler } = require('./services/vectorDestiny/billingScheduler');
startBillingScheduler();

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

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
