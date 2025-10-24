const express = require('express');
const router = express.Router();
const ReferralController = require('../controllers/referralController');
const { authMiddleware } = require('../middleware/auth');

// Все роуты требуют авторизации
router.get('/my-code', authMiddleware, ReferralController.getMyCode);
router.get('/stats', authMiddleware, ReferralController.getStats);

module.exports = router;
