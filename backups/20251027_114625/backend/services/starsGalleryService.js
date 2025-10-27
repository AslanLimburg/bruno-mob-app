// =====================================================
// BRT STARS CHALLENGE - GALLERY SERVICE
// backend/services/starsGalleryService.js
// =====================================================

const { pool } = require('../config/database');

class StarsGalleryService {
  
  /**
   * Добавить победителя в галерею (вызывается после закрытия Challenge)
   */
  static async addWinnerToGallery(challengeId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Получить данные Challenge
      const challenge = await client.query(
        `SELECT * FROM stars_challenges 
         WHERE id = $1 AND status = 'completed' AND winner_user_id IS NOT NULL`,
        [challengeId]
      );
      
      if (challenge.rows.length === 0) {
        throw new Error('Challenge not found or not completed');
      }
      
      const challengeData = challenge.rows[0];
      
      // Получить текущий номер недели и год
      const currentDate = new Date();
      const weekNumber = this.getWeekNumber(currentDate);
      const year = currentDate.getFullYear();
      
      // Проверить: уже есть победитель на этой неделе для этой номинации?
      const existing = await client.query(
        `SELECT id FROM stars_gallery_winners 
         WHERE nomination_id = $1 AND week_number = $2 AND year = $3 AND rank = 1`,
        [challengeData.nomination_id, weekNumber, year]
      );
      
      if (existing.rows.length > 0) {
        // Сдвинуть всех вниз
        await client.query(
          `UPDATE stars_gallery_winners 
           SET rank = rank + 1
           WHERE nomination_id = $1 AND year = $2
           ORDER BY rank DESC`,
          [challengeData.nomination_id, year]
        );
        
        // Удалить 53-е место (если есть)
        await client.query(
          `DELETE FROM stars_gallery_winners 
           WHERE nomination_id = $1 AND rank > 52`,
          [challengeData.nomination_id]
        );
      }
      
      // Получить данные участника-победителя
      const participant = await client.query(
        `SELECT * FROM stars_challenge_participants 
         WHERE challenge_id = $1 AND user_id = $2 AND is_winner = true`,
        [challengeId, challengeData.winner_user_id]
      );
      
      // Добавить победителя на 1 место
      await client.query(
        `INSERT INTO stars_gallery_winners 
         (nomination_id, challenge_id, user_id, photo_id, week_number, year, total_stars, total_brt_won, rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
        [
          challengeData.nomination_id,
          challengeId,
          challengeData.winner_user_id,
          challengeData.winner_photo_id,
          weekNumber,
          year,
          challengeData.winner_total_votes,
          participant.rows[0].total_brt_collected * 0.50 // 50% от пула
        ]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Winner added to gallery successfully',
        week_number: weekNumber,
        year: year
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add winner to gallery error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Получить галерею победителей для номинации
   */
  static async getGalleryByNomination(nominationId, limit = 52) {
    try {
      const result = await pool.query(
        `SELECT 
          w.*,
          u.name as winner_name,
          u.email as winner_email,
          p.photo_url,
          c.title as challenge_title,
          n.title as nomination_title
         FROM stars_gallery_winners w
         JOIN users u ON w.user_id = u.id
         JOIN stars_photos p ON w.photo_id = p.id
         JOIN stars_challenges c ON w.challenge_id = c.id
         JOIN stars_gallery_nominations n ON w.nomination_id = n.id
         WHERE w.nomination_id = $1 AND w.expires_at > NOW()
         ORDER BY w.rank ASC
         LIMIT $2`,
        [nominationId, limit]
      );
      
      return {
        success: true,
        winners: result.rows
      };
      
    } catch (error) {
      console.error('Get gallery by nomination error:', error);
      throw error;
    }
  }
  
  /**
   * Получить все номинации
   */
  static async getNominations() {
    try {
      const result = await pool.query(
        `SELECT 
          n.*,
          u.name as created_by_name,
          COUNT(DISTINCT w.id) as winners_count
         FROM stars_gallery_nominations n
         JOIN users u ON n.created_by = u.id
         LEFT JOIN stars_gallery_winners w ON n.id = w.nomination_id AND w.expires_at > NOW()
         WHERE n.is_active = true
         GROUP BY n.id, u.name
         ORDER BY n.created_at DESC`
      );
      
      return {
        success: true,
        nominations: result.rows
      };
      
    } catch (error) {
      console.error('Get nominations error:', error);
      throw error;
    }
  }
  
  /**
   * Создать номинацию (только админы)
   */
  static async createNomination(adminId, title, description) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверить права
      const admin = await client.query(
        `SELECT role FROM users WHERE id = $1`,
        [adminId]
      );
      
      if (!admin.rows[0] || !['admin', 'moderator'].includes(admin.rows[0].role)) {
        throw new Error('Only admins can create nominations');
      }
      
      // Создать номинацию
      const result = await client.query(
        `INSERT INTO stars_gallery_nominations (title, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [title, description, adminId]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        nomination: result.rows[0],
        message: 'Nomination created successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create nomination error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Cleanup job - удаление победителей старше 365 дней
   */
  static async deleteExpiredWinners() {
    try {
      const result = await pool.query(
        `DELETE FROM stars_gallery_winners 
         WHERE expires_at < NOW()
         RETURNING *`
      );
      
      console.log(`🧹 Deleted ${result.rows.length} expired gallery winners`);
      
      return {
        success: true,
        deleted_count: result.rows.length
      };
      
    } catch (error) {
      console.error('Delete expired winners error:', error);
      throw error;
    }
  }
  
  /**
   * Получить текущего победителя недели
   */
  static async getCurrentWeekWinner(nominationId) {
    try {
      const currentDate = new Date();
      const weekNumber = this.getWeekNumber(currentDate);
      const year = currentDate.getFullYear();
      
      const result = await pool.query(
        `SELECT 
          w.*,
          u.name as winner_name,
          p.photo_url,
          c.title as challenge_title
         FROM stars_gallery_winners w
         JOIN users u ON w.user_id = u.id
         JOIN stars_photos p ON w.photo_id = p.id
         JOIN stars_challenges c ON w.challenge_id = c.id
         WHERE w.nomination_id = $1 AND w.week_number = $2 AND w.year = $3 AND w.rank = 1`,
        [nominationId, weekNumber, year]
      );
      
      return {
        success: true,
        winner: result.rows[0] || null,
        week_number: weekNumber,
        year: year
      };
      
    } catch (error) {
      console.error('Get current week winner error:', error);
      throw error;
    }
  }
  
  /**
   * Вспомогательная функция - получить номер недели
   */
  static getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

module.exports = StarsGalleryService;