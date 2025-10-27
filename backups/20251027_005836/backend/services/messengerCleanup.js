const pool = require('../config/database');

// Удаление истёкших сообщений
const cleanupExpiredMessages = async () => {
  try {
    const result = await pool.query(
      `UPDATE messages 
       SET is_deleted = true 
       WHERE expires_at < NOW() AND is_deleted = false
       RETURNING id`
    );

    if (result.rows.length > 0) {
      console.log(`🗑️  Deleted ${result.rows.length} expired messages`);
    }
  } catch (error) {
    console.error('Cleanup expired messages error:', error);
  }
};

// Запуск worker (каждую минуту)
const startMessengerCleanup = () => {
  console.log('🧹 Messenger Cleanup Worker started (runs every minute)');
  
  // Запуск сразу
  cleanupExpiredMessages();
  
  // Повторяющийся запуск каждые 60 секунд
  setInterval(cleanupExpiredMessages, 60000);
};

module.exports = { startMessengerCleanup, cleanupExpiredMessages };