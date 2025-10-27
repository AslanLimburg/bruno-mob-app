// =====================================================
// BRT STARS CHALLENGE - VOTING SERVICE
// backend/services/starsVotingService.js
// =====================================================

const { pool } = require('../config/database');

class StarsVotingService {
  
  /**
   * Отправить Stars на фото
   * @param {number} fromUserId 
   * @param {number} photoId 
   * @param {number} starsCount - количество Stars (1-50)
   * @returns {object}
   */
  static async sendStars(fromUserId, photoId, starsCount) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Валидация
      if (starsCount < 1 || starsCount > 50) {
        throw new Error('Stars count must be between 1 and 50');
      }
      
      // Получить фото и владельца
      const photo = await client.query(
        `SELECT p.*, u.id as owner_id 
         FROM stars_photos p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = $1 AND p.status = 'active'`,
        [photoId]
      );
      
      if (photo.rows.length === 0) {
        throw new Error('Photo not found or inactive');
      }
      
      const ownerId = photo.rows[0].owner_id;
      
      // Нельзя голосовать за своё фото
      if (fromUserId === ownerId) {
        throw new Error('You cannot vote for your own photo');
      }
      
      // Проверить баланс отправителя
      const balance = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
        [fromUserId]
      );
      
      const totalBRT = starsCount; // 1 Star = 1 BRT
      
      if (!balance.rows[0] || balance.rows[0].balance < totalBRT) {
        throw new Error(`Insufficient BRT balance. Need ${totalBRT} BRT.`);
      }
      
      // Проверить: уже голосовал за это фото?
      const existingVote = await client.query(
        `SELECT id, stars_count FROM stars_photo_votes 
         WHERE photo_id = $1 AND from_user_id = $2`,
        [photoId, fromUserId]
      );
      
      if (existingVote.rows.length > 0) {
        throw new Error('You have already voted for this photo');
      }
      
      // Рассчитать суммы
      const ownerReceives = totalBRT * 0.98; // 98%
      const gasFee = totalBRT * 0.02; // 2%
      
      // Списать BRT у отправителя
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [totalBRT, fromUserId]
      );
      
      // Начислить владельцу фото
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [ownerReceives, ownerId]
      );
      
      // Начислить gas fee
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = NOW()
         WHERE user_id = 11 AND crypto = 'BRT'`, // id=11 = gasfee@brunotoken.com
        [gasFee]
      );
      
      // Записать транзакцию (отправитель → владелец)
      const txn1 = await client.query(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, crypto, amount, type, status, reference_id, reference_type)
         VALUES ($1, $2, 'BRT', $3, 'star_reward', 'completed', $4, 'photo')
         RETURNING id`,
        [fromUserId, ownerId, ownerReceives, photoId]
      );
      
      // Записать транзакцию gas fee
      await client.query(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, crypto, amount, type, status, reference_id, reference_type)
         VALUES ($1, 11, 'BRT', $2, 'gas_fee', 'completed', $3, 'photo')`,
        [fromUserId, gasFee, photoId]
      );
      
      // Записать голос в stars_photo_votes
      await client.query(
        `INSERT INTO stars_photo_votes (photo_id, from_user_id, stars_count, brt_amount, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [photoId, fromUserId, starsCount, totalBRT]
      );
      
      // Триггер автоматически обновит total_stars в таблице stars_photos
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: `Successfully sent ${starsCount} Stars!`,
        details: {
          stars_sent: starsCount,
          brt_spent: totalBRT,
          owner_received: ownerReceives,
          gas_fee: gasFee,
          transaction_id: txn1.rows[0].id
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Send stars error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Получить историю голосов пользователя
   */
  static async getUserVoteHistory(userId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT 
          v.*,
          p.photo_url,
          u.name as photo_owner_name,
          u.id as photo_owner_id
         FROM stars_photo_votes v
         JOIN stars_photos p ON v.photo_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE v.from_user_id = $1
         ORDER BY v.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      
      return {
        success: true,
        votes: result.rows
      };
      
    } catch (error) {
      console.error('Get vote history error:', error);
      throw error;
    }
  }
  
  /**
   * Получить топ-фото по Stars
   */
  static async getTopPhotos(limit = 20, period = 'all') {
    try {
      let dateFilter = '';
      
      if (period === 'week') {
        dateFilter = `AND v.created_at > NOW() - INTERVAL '7 days'`;
      } else if (period === 'month') {
        dateFilter = `AND v.created_at > NOW() - INTERVAL '30 days'`;
      } else if (period === 'year') {
        dateFilter = `AND v.created_at > NOW() - INTERVAL '365 days'`;
      }
      
      const result = await pool.query(
        `SELECT 
          p.*,
          u.name as owner_name,
          u.id as owner_id,
          COALESCE(SUM(v.stars_count), 0) as total_stars,
          COALESCE(SUM(v.brt_amount), 0) as total_brt_earned,
          COUNT(DISTINCT v.from_user_id) as unique_voters
         FROM stars_photos p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN stars_photo_votes v ON p.id = v.photo_id ${dateFilter}
         WHERE p.status = 'active' AND p.moderation_status = 'approved'
         GROUP BY p.id, u.name, u.id
         ORDER BY total_stars DESC
         LIMIT $1`,
        [limit]
      );
      
      return {
        success: true,
        photos: result.rows,
        period
      };
      
    } catch (error) {
      console.error('Get top photos error:', error);
      throw error;
    }
  }
  
  /**
   * Получить статистику Stars пользователя
   */
  static async getUserStarsStats(userId) {
    try {
      // Stars полученные (как владелец фото)
      const received = await pool.query(
        `SELECT 
          COUNT(DISTINCT v.from_user_id) as unique_voters,
          COALESCE(SUM(v.stars_count), 0) as total_stars_received,
          COALESCE(SUM(v.brt_amount * 0.98), 0) as total_brt_earned
         FROM stars_photos p
         LEFT JOIN stars_photo_votes v ON p.id = v.photo_id
         WHERE p.user_id = $1 AND p.status = 'active'`,
        [userId]
      );
      
      // Stars отправленные
      const sent = await pool.query(
        `SELECT 
          COUNT(*) as votes_count,
          COALESCE(SUM(stars_count), 0) as total_stars_sent,
          COALESCE(SUM(brt_amount), 0) as total_brt_spent
         FROM stars_photo_votes
         WHERE from_user_id = $1`,
        [userId]
      );
      
      // Stars по периодам (полученные)
      const periods = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN v.created_at > NOW() - INTERVAL '7 days' THEN v.stars_count ELSE 0 END), 0) as week_stars,
          COALESCE(SUM(CASE WHEN v.created_at > NOW() - INTERVAL '30 days' THEN v.stars_count ELSE 0 END), 0) as month_stars,
          COALESCE(SUM(CASE WHEN v.created_at > NOW() - INTERVAL '365 days' THEN v.stars_count ELSE 0 END), 0) as year_stars
         FROM stars_photos p
         LEFT JOIN stars_photo_votes v ON p.id = v.photo_id
         WHERE p.user_id = $1 AND p.status = 'active'`,
        [userId]
      );
      
      return {
        success: true,
        stats: {
          received: received.rows[0],
          sent: sent.rows[0],
          periods: periods.rows[0]
        }
      };
      
    } catch (error) {
      console.error('Get user stars stats error:', error);
      throw error;
    }
  }
  
  /**
   * Получить список людей, которые проголосовали за фото
   */
  static async getPhotoVoters(photoId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT 
          v.stars_count,
          v.created_at,
          u.id as voter_id,
          u.name as voter_name,
          u.email as voter_email
         FROM stars_photo_votes v
         JOIN users u ON v.from_user_id = u.id
         WHERE v.photo_id = $1
         ORDER BY v.stars_count DESC, v.created_at DESC
         LIMIT $2`,
        [photoId, limit]
      );
      
      return {
        success: true,
        voters: result.rows
      };
      
    } catch (error) {
      console.error('Get photo voters error:', error);
      throw error;
    }
  }
}

module.exports = StarsVotingService;