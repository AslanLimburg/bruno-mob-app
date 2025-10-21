const express = require('express');
const router = express.Router();
const ChallengeController = require('../controllers/challengeController');
const { authMiddleware } = require('../middleware/auth');
const moderatorMiddleware = require('../middleware/moderator');

router.get('/', ChallengeController.getChallenges);
router.get('/:challengeId', ChallengeController.getChallengeDetails);
router.post('/', authMiddleware, ChallengeController.createChallenge);
router.post('/:challengeId/open', authMiddleware, ChallengeController.openChallenge);
router.post('/:challengeId/close', authMiddleware, ChallengeController.closeChallenge);
router.post('/:challengeId/bets', authMiddleware, ChallengeController.placeBet);
router.post('/:challengeId/resolve', authMiddleware, ChallengeController.resolveChallenge);
router.get('/my/bets', authMiddleware, ChallengeController.getMyBets);
router.post('/:challengeId/process-payouts', authMiddleware, ChallengeController.processPayouts);
router.get('/:challengeId/payouts', ChallengeController.getChallengePayouts);
router.post('/:challengeId/dispute', authMiddleware, ChallengeController.createDispute);
router.get('/:challengeId/disputes', authMiddleware, ChallengeController.getChallengeDisputes);
router.post('/dispute/:disputeId/resolve', authMiddleware, moderatorMiddleware, ChallengeController.resolveDispute);

module.exports = router;
