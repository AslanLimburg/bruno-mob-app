const pool = require('../config/database');

const moderator = async (req, res, next) => {
  try {
    // Получить user_id из auth middleware
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Проверить роль пользователя
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userRole = result.rows[0].role;

    // Проверить, является ли пользователь модератором
    if (userRole !== 'moderator' && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Moderator privileges required.' 
      });
    }

    // Пользователь - модератор, продолжаем
    next();
  } catch (error) {
    console.error('Moderator middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = moderator;
