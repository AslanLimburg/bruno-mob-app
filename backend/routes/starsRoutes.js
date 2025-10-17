const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const StarsController = require('../controllers/starsController');
const { authMiddleware } = require('../middleware/auth');
const moderatorMiddleware = require('../middleware/moderator');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/stars/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/photo/upload', authMiddleware, upload.single('photo'), StarsController.uploadPhoto);
router.get('/photo/user/:userId', authMiddleware, StarsController.getUserPhotos);
router.post('/photo/:photoId/renew', authMiddleware, StarsController.renewPhoto);
router.delete('/photo/:photoId', authMiddleware, StarsController.deletePhoto);
router.get('/photo/:photoId/stats', authMiddleware, StarsController.getPhotoStats);
router.post('/vote', authMiddleware, StarsController.sendStars);
router.get('/vote/history', authMiddleware, StarsController.getUserVoteHistory);
router.get('/top', authMiddleware, StarsController.getTopPhotos);
router.get('/stats', authMiddleware, StarsController.getUserStarsStats);
router.post('/challenge/create', authMiddleware, moderatorMiddleware, StarsController.createChallenge);
router.get('/challenge/active', authMiddleware, StarsController.getActiveChallenges);
router.post('/challenge/:challengeId/submit', authMiddleware, StarsController.submitPhotoToChallenge);
router.post('/challenge/:challengeId/vote', authMiddleware, StarsController.voteInChallenge);
router.get('/challenge/:challengeId/leaderboard', authMiddleware, StarsController.getChallengeLeaderboard);
router.post('/challenge/:challengeId/close', authMiddleware, moderatorMiddleware, StarsController.closeChallenge);
router.get('/gallery/nominations', authMiddleware, StarsController.getNominations);
router.post('/gallery/nomination/create', authMiddleware, moderatorMiddleware, StarsController.createNomination);
router.get('/gallery/:nominationId', authMiddleware, StarsController.getGalleryByNomination);
router.get('/gallery/:nominationId/current-winner', authMiddleware, StarsController.getCurrentWeekWinner);

module.exports = router;
