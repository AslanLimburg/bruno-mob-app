const express = require('express');
const router = express.Router();
const ActivationController = require('../controllers/activationController');

// Временный middleware (TODO: использовать настоящий JWT)
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  // TODO: верифицировать токен
  req.userId = 1; // временно
  next();
};

// Все роуты требуют авторизации
router.use(authenticateToken);

// Активировать код (Coupon)
router.post('/redeem', ActivationController.redeemCode);

// Получить свои коды
router.get('/my-codes', ActivationController.getMyCodes);

// Проверить код (без активации)
router.post('/check', ActivationController.checkCode);

module.exports = router;