require('dotenv').config();
const passport = require('passport');
require('./config/passport')(passport);
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const referralRoutes = require('./routes/referralRoutes');
const lotteryRoutes = require('./routes/lotteryRoutes');
const clubAvalancheRoutes = require('./routes/clubAvalancheRoutes');
const challengeRoutes = require('./routes/challengeRoutes'); // ← ДОБАВЛЕНО
const messengerRoutes = require('./routes/messengerRoutes');
const { startAllSchedulers } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
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
app.use('/api/messenger', messengerRoutes);

// Запустить Unified Scheduler
startAllSchedulers();

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
