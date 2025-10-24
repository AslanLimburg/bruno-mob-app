// Lottery Routes
// Path: ~/bruno-token-app/backend/routes/lotteryRoutes.js

const express = require('express');
const router = express.Router();
const lotteryController = require('../controllers/lotteryController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/current', lotteryController.getCurrentDraw);
router.get('/jackpot', lotteryController.getJackpot);
router.get('/history', lotteryController.getDrawHistory);
router.get('/quick-pick', lotteryController.quickPick);

// Protected routes
router.post('/buy', authMiddleware, lotteryController.buyTicket);
router.get('/my-tickets', authMiddleware, lotteryController.getMyTickets);

module.exports = router;
