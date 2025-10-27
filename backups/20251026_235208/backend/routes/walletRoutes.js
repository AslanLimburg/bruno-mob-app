const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  updateWalletAddress,
  updateTronAddress,
  getWalletInfo,
  disconnectWallet,
  disconnectTronWallet,
  getTransactions,
  sendCrypto,
} = require('../controllers/walletController');

// MetaMask
router.post('/wallet', authMiddleware, updateWalletAddress);
router.get('/wallet', authMiddleware, getWalletInfo);
router.delete('/wallet', authMiddleware, disconnectWallet);

// TronLink
router.post('/tron-wallet', authMiddleware, updateTronAddress);
router.delete('/tron-wallet', authMiddleware, disconnectTronWallet);

// Transactions
router.get('/transactions', authMiddleware, getTransactions);

// Send crypto to another user (internal transfer)
router.post('/send', authMiddleware, sendCrypto);

module.exports = router;