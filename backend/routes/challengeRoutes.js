const express = require('express');
const router = express.Router();
const ChallengeController = require('../controllers/challengeController');
const { authMiddleware } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all challenges (list/search)
router.get('/', ChallengeController.getChallenges);

// Get challenge details
router.get('/:challengeId', ChallengeController.getChallengeDetails);

// ============================================
// PROTECTED ROUTES
// ============================================

// Create new challenge
router.post('/', authMiddleware, ChallengeController.createChallenge);

// Open challenge for betting
router.post('/:challengeId/open', authMiddleware, ChallengeController.openChallenge);

// Close challenge for betting
router.post('/:challengeId/close', authMiddleware, ChallengeController.closeChallenge);

// Place bet on challenge
router.post('/:challengeId/bets', authMiddleware, ChallengeController.placeBet);

// Resolve challenge (set winner)
router.post('/:challengeId/resolve', authMiddleware, ChallengeController.resolveChallenge);

// Get my bets
router.get('/my/bets', authMiddleware, ChallengeController.getMyBets);

module.exports = router;
