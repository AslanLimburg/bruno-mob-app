const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Загружаем пользователя из базы
    const userResult = await pool.query(
      'SELECT id, email, name, role, account_status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.account_status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    // Устанавливаем и userId и user для обратной совместимости
    req.userId = decoded.userId;
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { authMiddleware };
