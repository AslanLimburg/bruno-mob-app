const { pool } = require('../config/database');

class MessengerController {
  // Отправка сообщения
  static async sendMessage(req, res) {
    const client = await pool.connect();
    try {
      const { to_user_id, message_text, attachment_url, attachment_type } = req.body;
      const from_user_id = req.userId;

      if (!to_user_id) {
        return res.status(400).json({ success: false, message: 'Recipient required' });
      }

      if (!message_text && !attachment_url) {
        return res.status(400).json({ success: false, message: 'Message or attachment required' });
      }

      await client.query('BEGIN');

      // Проверяем, существует ли получатель
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [to_user_id]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Создаём сообщение
      const messageResult = await client.query(
        `INSERT INTO messages (from_user_id, to_user_id, message_text, attachment_url, attachment_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [from_user_id, to_user_id, message_text, attachment_url, attachment_type]
      );

      const message = messageResult.rows[0];

      // Обновляем контакты для отправителя
      await client.query(
        `INSERT INTO messenger_contacts (user_id, contact_user_id, last_message_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, contact_user_id)
         DO UPDATE SET last_message_at = NOW()`,
        [from_user_id, to_user_id]
      );

      // Обновляем контакты для получателя (увеличиваем unread_count)
      await client.query(
        `INSERT INTO messenger_contacts (user_id, contact_user_id, last_message_at, unread_count)
         VALUES ($1, $2, NOW(), 1)
         ON CONFLICT (user_id, contact_user_id)
         DO UPDATE SET last_message_at = NOW(), unread_count = messenger_contacts.unread_count + 1`,
        [to_user_id, from_user_id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Message sent',
        data: message
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Send message error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      client.release();
    }
  }

  // Получить переписку с пользователем
  static async getConversation(req, res) {
    try {
      const { userId } = req.params;
      const myUserId = req.userId;

      const result = await pool.query(
        `SELECT m.*, 
                u_from.name as from_user_name,
                u_to.name as to_user_name
         FROM messages m
         JOIN users u_from ON m.from_user_id = u_from.id
         JOIN users u_to ON m.to_user_id = u_to.id
         WHERE ((m.from_user_id = $1 AND m.to_user_id = $2)
            OR (m.from_user_id = $2 AND m.to_user_id = $1))
           AND m.is_deleted = false
           AND m.expires_at > NOW()
         ORDER BY m.created_at DESC
         LIMIT 100`,
        [myUserId, userId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Получить список контактов
  static async getContacts(req, res) {
    try {
      const myUserId = req.userId;

      const result = await pool.query(
        `SELECT mc.*, u.name, u.email
         FROM messenger_contacts mc
         JOIN users u ON mc.contact_user_id = u.id
         WHERE mc.user_id = $1
         ORDER BY mc.last_message_at DESC`,
        [myUserId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Отметить сообщения как прочитанные
  static async markAsRead(req, res) {
    try {
      const { userId } = req.params;
      const myUserId = req.userId;

      await pool.query(
        `UPDATE messages 
         SET is_read = true
         WHERE from_user_id = $1 AND to_user_id = $2 AND is_read = false`,
        [userId, myUserId]
      );

      // Обнуляем счётчик непрочитанных
      await pool.query(
        `UPDATE messenger_contacts
         SET unread_count = 0
         WHERE user_id = $1 AND contact_user_id = $2`,
        [myUserId, userId]
      );

      res.json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Поиск пользователей для начала чата
  static async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const myUserId = req.userId;

      if (!query || query.length < 2) {
        return res.status(400).json({ success: false, message: 'Query too short' });
      }

      const result = await pool.query(
        `SELECT id, name, email
         FROM users
         WHERE (name ILIKE $1 OR email ILIKE $1)
           AND id != $2
           AND account_status = 'active'
         LIMIT 20`,
        [`%${query}%`, myUserId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = MessengerController;