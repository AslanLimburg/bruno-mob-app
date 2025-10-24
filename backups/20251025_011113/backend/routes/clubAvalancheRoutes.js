const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  joinProgram,
  getMyPrograms,
  getStats,
  getReferralTree
} = require('../controllers/clubAvalancheController');

// Все роуты требуют авторизации
router.use(authMiddleware);

// POST /api/club-avalanche/join - покупка программы
router.post('/join', joinProgram);

// GET /api/club-avalanche/my-programs - мои программы
router.get('/my-programs', getMyPrograms);

// GET /api/club-avalanche/stats - статистика
router.get('/stats', getStats);

// GET /api/club-avalanche/tree/:program - древо рефералов
router.get('/tree/:program', getReferralTree);

module.exports = router;
