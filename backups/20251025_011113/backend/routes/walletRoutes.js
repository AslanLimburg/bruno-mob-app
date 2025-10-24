const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  updateWalletAddress,
  updateTronAddress,
  getWalletInfo,
  disconnectWallet,
  disconnectTronWallet,
} = require('../controllers/walletController');

// MetaMask
router.post('/wallet', authMiddleware, updateWalletAddress);
router.get('/wallet', authMiddleware, getWalletInfo);
router.delete('/wallet', authMiddleware, disconnectWallet);

// TronLink
router.post('/tron-wallet', authMiddleware, updateTronAddress);
router.delete('/tron-wallet', authMiddleware, disconnectTronWallet);

module.exports = router;