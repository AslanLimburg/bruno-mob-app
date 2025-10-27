const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  saveCryptoTransaction,
  getCryptoTransactions,
  getTransactionByHash,
  updateTransactionStatus,
} = require('../controllers/transactionController');

// Protect all routes with authentication
router.use(authMiddleware);

// Crypto transactions (on-chain)
router.post('/crypto', saveCryptoTransaction);
router.get('/crypto', getCryptoTransactions);
router.get('/crypto/:txHash', getTransactionByHash);
router.patch('/crypto/:txHash/status', updateTransactionStatus);

module.exports = router;