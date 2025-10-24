const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getTreasuryAddresses,
  getTreasuryBalances,
  getBRTCReserve,
  getBRTCPrice,
  getAllPrices,
} = require('../controllers/treasuryController');

// Публичные endpoints
router.get('/prices', getAllPrices);
router.get('/brtc-price', getBRTCPrice);

// Защищённые endpoints (требуют авторизации)
router.get('/addresses', authMiddleware, getTreasuryAddresses);
router.get('/balances', authMiddleware, getTreasuryBalances);
router.get('/reserve', authMiddleware, getBRTCReserve);

module.exports = router;