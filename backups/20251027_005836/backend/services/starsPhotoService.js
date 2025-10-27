// =====================================================
// BRT STARS CHALLENGE - PHOTO SERVICE
// backend/services/starsPhotoService.js
// =====================================================

const { pool } = require('../config/database');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Cloudinary configuration
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️  Cloudinary not configured - using local storage');
}

class StarsPhotoService {
  
  /**
   * Загрузка фото
   * @param {number} userId 
   * @param {object} file - multer file object
   * @param {boolean} isMainPhoto 
   * @returns {object} photo data
   */
  static async uploadPhoto(userId, file, isMainPhoto = false) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверка: у юзера уже есть главное фото?
      if (isMainPhoto) {
        const existingMain = await client.query(
          `SELECT id FROM stars_photos 
           WHERE user_id = $1 AND is_main_photo = true AND status = 'active'`,
          [userId]
        );
        
        if (existingMain.rows.length > 0) {
          // Проверить можно ли менять (раз в неделю)
          const lastChange = await client.query(
            `SELECT upload_date FROM stars_photos 
             WHERE user_id = $1 AND is_main_photo = true 
             ORDER BY upload_date DESC LIMIT 1`,
            [userId]
          );
          
          const daysSinceLastChange = Math.floor(
            (Date.now() - new Date(lastChange.rows[0].upload_date)) / (1000 * 60 * 60 * 24)
          );
          
          if (daysSinceLastChange < 7) {
            throw new Error(`Main photo can be changed once per week. Days remaining: ${7 - daysSinceLastChange}`);
          }
          
          // Удалить старое главное фото
          await client.query(
            `UPDATE stars_photos SET status = 'deleted', is_main_photo = false 
             WHERE user_id = $1 AND is_main_photo = true`,
            [userId]
          );
        }
      } else {
        // Дополнительное фото - списать 1 BRT
        const balance = await client.query(
          `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
          [userId]
        );
        
        if (!balance.rows[0] || balance.rows[0].balance < 1) {
          throw new Error('Insufficient BRT balance. Need 1 BRT to upload additional photo.');
        }
        
        // Списать 1 BRT
        await client.query(
          `UPDATE user_balances 
           SET balance = balance - 1, updated_at = NOW()
           WHERE user_id = $1 AND crypto = 'BRT'`,
          [userId]
        );
        
        // Начислить 1 BRT admin@brunotoken.com (id=1)
        await client.query(
          `UPDATE user_balances 
           SET balance = balance + 1, updated_at = NOW()
           WHERE user_id = 1 AND crypto = 'BRT'`,
          []
        );
        
        // Записать транзакцию
        await client.query(
          `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
           VALUES ($1, 1, 'BRT', 1, 'photo_upload', 'completed')`,
          [userId]
        );
      }
      
      let photoUrl, cloudinaryPublicId = null;
      
      // Загрузить фото
      if (isCloudinaryConfigured) {
        // Загрузить на Cloudinary с AI Moderation
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'bruno-stars',
          resource_type: 'image',
          moderation: 'aws_rek', // AI модерация (требует paid plan)
        });
        
        photoUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
      } else {
        // Использовать local storage
        photoUrl = `/uploads/stars/${file.filename}`;
      }
      
      // Сохранить в БД
      const result = await client.query(
        `INSERT INTO stars_photos 
         (user_id, photo_url, cloudinary_public_id, is_main_photo, moderation_status, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          photoUrl,
          cloudinaryPublicId,
          isMainPhoto,
          'approved', // пока без модерации для local
          'active'
        ]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        photo: result.rows[0],
        message: isMainPhoto ? 'Main photo uploaded successfully' : 'Photo uploaded successfully (1 BRT charged)'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Upload photo error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Получить фото пользователя
   */
  static async getUserPhotos(userId, viewerId = null) {
    try {
      // Проверить приватность
      if (viewerId && viewerId !== userId) {
        const privacy = await pool.query(
          `SELECT profile_visibility FROM stars_privacy_settings WHERE user_id = $1`,
          [userId]
        );
        
        if (privacy.rows[0]?.profile_visibility === 'private') {
          throw new Error('This profile is private');
        }
        
        if (privacy.rows[0]?.profile_visibility === 'friends_only') {
          const isFriend = await pool.query(
            `SELECT id FROM stars_friends 
             WHERE (user_id = $1 AND friend_user_id = $2 OR user_id = $2 AND friend_user_id = $1)
             AND status = 'accepted'`,
            [userId, viewerId]
          );
          
          if (isFriend.rows.length === 0) {
            throw new Error('You must be friends to view this profile');
          }
        }
      }
      
      // Получить фото
      const result = await pool.query(
        `SELECT 
          p.*,
          u.name as owner_name,
          u.email as owner_email,
          CASE 
            WHEN expires_at < NOW() + INTERVAL '30 days' THEN true 
            ELSE false 
          END as is_expiring_soon
         FROM stars_photos p
         JOIN users u ON p.user_id = u.id
         WHERE p.user_id = $1 AND p.status = 'active'
         ORDER BY p.is_main_photo DESC, p.upload_date DESC`,
        [userId]
      );
      
      return {
        success: true,
        photos: result.rows
      };
      
    } catch (error) {
      console.error('Get user photos error:', error);
      throw error;
    }
  }
  
  /**
   * Продлить фото на год (1 BRT)
   */
  static async renewPhoto(userId, photoId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверить владельца
      const photo = await client.query(
        `SELECT * FROM stars_photos WHERE id = $1 AND user_id = $2`,
        [photoId, userId]
      );
      
      if (photo.rows.length === 0) {
        throw new Error('Photo not found or you are not the owner');
      }
      
      // Проверить баланс
      const balance = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
        [userId]
      );
      
      if (!balance.rows[0] || balance.rows[0].balance < 1) {
        throw new Error('Insufficient BRT balance');
      }
      
      // Списать 1 BRT
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - 1, updated_at = NOW()
         WHERE user_id = $1 AND crypto = 'BRT'`,
        [userId]
      );
      
      // Начислить admin
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + 1, updated_at = NOW()
         WHERE user_id = 1 AND crypto = 'BRT'`,
        []
      );
      
      // Продлить фото
      await client.query(
        `UPDATE stars_photos 
         SET expires_at = expires_at + INTERVAL '365 days',
             last_renewed_at = NOW(),
             status = 'active',
             updated_at = NOW()
         WHERE id = $1`,
        [photoId]
      );
      
      // Записать транзакцию
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, reference_id)
         VALUES ($1, 1, 'BRT', 1, 'photo_renewal', 'completed', $2)`,
        [userId, photoId]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Photo renewed for 1 year (1 BRT charged)'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Renew photo error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Удалить фото
   */
  static async deletePhoto(userId, photoId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Получить фото
      const photo = await client.query(
        `SELECT * FROM stars_photos WHERE id = $1 AND user_id = $2`,
        [photoId, userId]
      );
      
      if (photo.rows.length === 0) {
        throw new Error('Photo not found or you are not the owner');
      }
      
      // Удалить из Cloudinary (только если настроен)
      if (isCloudinaryConfigured && photo.rows[0].cloudinary_public_id) {
        await cloudinary.uploader.destroy(photo.rows[0].cloudinary_public_id);
      }
      
      // Пометить как удалённое
      await client.query(
        `UPDATE stars_photos SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
        [photoId]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: 'Photo deleted successfully'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete photo error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Cleanup job - удаление истёкших фото
   */
  static async deleteExpiredPhotos() {
    try {
      // Найти истёкшие фото
      const expired = await pool.query(
        `SELECT * FROM stars_photos 
         WHERE expires_at < NOW() AND status = 'active'`
      );
      
      console.log(`🧹 Found ${expired.rows.length} expired photos to delete`);
      
      for (const photo of expired.rows) {
        // Удалить из Cloudinary (только если настроен)
        if (isCloudinaryConfigured && photo.cloudinary_public_id) {
          await cloudinary.uploader.destroy(photo.cloudinary_public_id);
        }
        
        // Обновить статус
        await pool.query(
          `UPDATE stars_photos SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [photo.id]
        );
      }
      
      console.log(`✅ Deleted ${expired.rows.length} expired photos`);
      
      return {
        success: true,
        deleted_count: expired.rows.length
      };
      
    } catch (error) {
      console.error('Delete expired photos error:', error);
      throw error;
    }
  }
  
  /**
   * Получить статистику фото
   */
  static async getPhotoStats(photoId) {
    try {
      const result = await pool.query(
        `SELECT 
          p.*,
          u.name as owner_name,
          COUNT(DISTINCT pv.from_user_id) as unique_voters,
          COALESCE(SUM(pv.stars_count), 0) as total_stars_received,
          COALESCE(SUM(pv.brt_amount), 0) as total_brt_earned
         FROM stars_photos p
         LEFT JOIN stars_photo_votes pv ON p.id = pv.photo_id
         JOIN users u ON p.user_id = u.id
         WHERE p.id = $1
         GROUP BY p.id, u.name`,
        [photoId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Photo not found');
      }
      
      return {
        success: true,
        stats: result.rows[0]
      };
      
    } catch (error) {
      console.error('Get photo stats error:', error);
      throw error;
    }
  }
}

module.exports = StarsPhotoService;
