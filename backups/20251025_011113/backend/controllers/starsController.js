// =====================================================
// BRT STARS CHALLENGE - CONTROLLER
// backend/controllers/starsController.js
// =====================================================

const StarsPhotoService = require('../services/starsPhotoService');
const StarsVotingService = require('../services/starsVotingService');
const StarsChallengeService = require('../services/starsChallengeService');
const StarsGalleryService = require('../services/starsGalleryService');

class StarsController {
  
  // ==================== PHOTO MANAGEMENT ====================
  
  /**
   * Загрузить фото
   * POST /api/stars/photo/upload
   */
  static async uploadPhoto(req, res) {
    try {
      const userId = req.user.id;
      const { isMainPhoto } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const result = await StarsPhotoService.uploadPhoto(
        userId, 
        req.file, 
        isMainPhoto === 'true'
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Upload photo error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить фото пользователя
   * GET /api/stars/photo/user/:userId
   */
  static async getUserPhotos(req, res) {
    try {
      const { userId } = req.params;
      const viewerId = req.user?.id;
      
      const result = await StarsPhotoService.getUserPhotos(parseInt(userId), viewerId);
      
      res.json(result);
      
    } catch (error) {
      console.error('Get user photos error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Продлить фото
   * POST /api/stars/photo/:photoId/renew
   */
  static async renewPhoto(req, res) {
    try {
      const userId = req.user.id;
      const { photoId } = req.params;
      
      const result = await StarsPhotoService.renewPhoto(userId, parseInt(photoId));
      
      res.json(result);
      
    } catch (error) {
      console.error('Renew photo error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Удалить фото
   * DELETE /api/stars/photo/:photoId
   */
  static async deletePhoto(req, res) {
    try {
      const userId = req.user.id;
      const { photoId } = req.params;
      
      const result = await StarsPhotoService.deletePhoto(userId, parseInt(photoId));
      
      res.json(result);
      
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить статистику фото
   * GET /api/stars/photo/:photoId/stats
   */
  static async getPhotoStats(req, res) {
    try {
      const { photoId } = req.params;
      
      const result = await StarsPhotoService.getPhotoStats(parseInt(photoId));
      
      res.json(result);
      
    } catch (error) {
      console.error('Get photo stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // ==================== VOTING SYSTEM ====================
  
  /**
   * Отправить Stars на фото
   * POST /api/stars/vote
   */
  static async sendStars(req, res) {
    try {
      const fromUserId = req.user.id;
      const { photoId, starsCount } = req.body;
      
      const result = await StarsVotingService.sendStars(
        fromUserId, 
        parseInt(photoId), 
        parseInt(starsCount)
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Send stars error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить историю голосов пользователя
   * GET /api/stars/vote/history
   */
  static async getUserVoteHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      
      const result = await StarsVotingService.getUserVoteHistory(userId, limit);
      
      res.json(result);
      
    } catch (error) {
      console.error('Get vote history error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить топ фото по Stars
   * GET /api/stars/top
   */
  static async getTopPhotos(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const period = req.query.period || 'all'; // all, week, month, year
      
      const result = await StarsVotingService.getTopPhotos(limit, period);
      
      res.json(result);
      
    } catch (error) {
      console.error('Get top photos error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить статистику Stars пользователя
   * GET /api/stars/stats
   */
  static async getUserStarsStats(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await StarsVotingService.getUserStarsStats(userId);
      
      res.json(result);
      
    } catch (error) {
      console.error('Get user stars stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // ==================== CHALLENGES ====================
  
  /**
   * Создать Challenge (только админы)
   * POST /api/stars/challenge/create
   */
  static async createChallenge(req, res) {
    try {
      const adminId = req.user.id;
      const challengeData = req.body;
      
      const result = await StarsChallengeService.createChallenge(adminId, challengeData);
      
      res.json(result);
      
    } catch (error) {
      console.error('Create challenge error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Отправить фото в Challenge
   * POST /api/stars/challenge/:challengeId/submit
   */
  static async submitPhotoToChallenge(req, res) {
    try {
      const userId = req.user.id;
      const { challengeId } = req.params;
      const { photoId } = req.body;
      
      const result = await StarsChallengeService.submitPhotoToChallenge(
        userId, 
        parseInt(photoId), 
        parseInt(challengeId)
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Submit photo to challenge error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Голосовать в Challenge
   * POST /api/stars/challenge/:challengeId/vote
   */
  static async voteInChallenge(req, res) {
    try {
      const fromUserId = req.user.id;
      const { challengeId } = req.params;
      const { participantId, starsCount } = req.body;
      
      const result = await StarsChallengeService.voteInChallenge(
        fromUserId, 
        parseInt(challengeId), 
        parseInt(participantId), 
        parseInt(starsCount)
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Vote in challenge error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить leaderboard Challenge
   * GET /api/stars/challenge/:challengeId/leaderboard
   */
  static async getChallengeLeaderboard(req, res) {
    try {
      const { challengeId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      const result = await StarsChallengeService.getChallengeLeaderboard(
        parseInt(challengeId), 
        limit
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Get challenge leaderboard error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Закрыть Challenge (только админы)
   * POST /api/stars/challenge/:challengeId/close
   */
  static async closeChallenge(req, res) {
    try {
      const adminId = req.user.id;
      const { challengeId } = req.params;
      
      const result = await StarsChallengeService.closeChallenge(
        adminId, 
        parseInt(challengeId)
      );
      
      // Добавить победителя в галерею
      if (result.success) {
        await StarsGalleryService.addWinnerToGallery(parseInt(challengeId));
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('Close challenge error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить активные Challenges
   * GET /api/stars/challenge/active
   */
  static async getActiveChallenges(req, res) {
    try {
      const result = await StarsChallengeService.getActiveChallenges();
      
      res.json(result);
      
    } catch (error) {
      console.error('Get active challenges error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // ==================== GALLERY ====================
  
  /**
   * Получить галерею победителей
   * GET /api/stars/gallery/:nominationId
   */
  static async getGalleryByNomination(req, res) {
    try {
      const { nominationId } = req.params;
      const limit = parseInt(req.query.limit) || 52;
      
      const result = await StarsGalleryService.getGalleryByNomination(
        parseInt(nominationId), 
        limit
      );
      
      res.json(result);
      
    } catch (error) {
      console.error('Get gallery error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить все номинации
   * GET /api/stars/gallery/nominations
   */
  static async getNominations(req, res) {
    try {
      const result = await StarsGalleryService.getNominations();
      
      res.json(result);
      
    } catch (error) {
      console.error('Get nominations error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Создать номинацию (только админы)
   * POST /api/stars/gallery/nomination/create
   */
  static async createNomination(req, res) {
    try {
      const adminId = req.user.id;
      const { title, description } = req.body;
      
      const result = await StarsGalleryService.createNomination(adminId, title, description);
      
      res.json(result);
      
    } catch (error) {
      console.error('Create nomination error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Получить текущего победителя недели
   * GET /api/stars/gallery/:nominationId/current-winner
   */
  static async getCurrentWeekWinner(req, res) {
    try {
      const { nominationId } = req.params;
      
      const result = await StarsGalleryService.getCurrentWeekWinner(parseInt(nominationId));
      
      res.json(result);
      
    } catch (error) {
      console.error('Get current week winner error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = {
  uploadPhoto: StarsController.uploadPhoto.bind(StarsController),
  getUserPhotos: StarsController.getUserPhotos.bind(StarsController),
  renewPhoto: StarsController.renewPhoto.bind(StarsController),
  deletePhoto: StarsController.deletePhoto.bind(StarsController),
  getPhotoStats: StarsController.getPhotoStats.bind(StarsController),
  sendStars: StarsController.sendStars.bind(StarsController),
  getUserVoteHistory: StarsController.getUserVoteHistory.bind(StarsController),
  getTopPhotos: StarsController.getTopPhotos.bind(StarsController),
  getUserStarsStats: StarsController.getUserStarsStats.bind(StarsController),
  createChallenge: StarsController.createChallenge.bind(StarsController),
  submitPhotoToChallenge: StarsController.submitPhotoToChallenge.bind(StarsController),
  voteInChallenge: StarsController.voteInChallenge.bind(StarsController),
  getChallengeLeaderboard: StarsController.getChallengeLeaderboard.bind(StarsController),
  closeChallenge: StarsController.closeChallenge.bind(StarsController),
  getActiveChallenges: StarsController.getActiveChallenges.bind(StarsController),
  getGalleryByNomination: StarsController.getGalleryByNomination.bind(StarsController),
  getNominations: StarsController.getNominations.bind(StarsController),
  createNomination: StarsController.createNomination.bind(StarsController),
  getCurrentWeekWinner: StarsController.getCurrentWeekWinner.bind(StarsController)
};