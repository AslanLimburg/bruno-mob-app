const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getRates,
  calculateSwap,
  swapCryptoToBRT,
  swapBRTToCrypto,
  swapBRTandBRTC,
  getSwapHistory,
} = require('../controllers/swapController');

// Все endpoints требуют авторизации
router.get('/rates', authMiddleware, getRates);
router.post('/calculate', authMiddleware, calculateSwap);
router.post('/crypto-to-brt', authMiddleware, swapCryptoToBRT);
router.post('/brt-to-crypto', authMiddleware, swapBRTToCrypto);
router.post('/brt-brtc', authMiddleware, swapBRTandBRTC);
router.get('/history', authMiddleware, getSwapHistory);

module.exports = router;