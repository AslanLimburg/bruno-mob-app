/**
 * Moderator Middleware
 * Проверяет, что пользователь имеет роль 'moderator'
 */

const moderator = async (req, res, next) => {
  try {
    // Проверяем, что пользователь аутентифицирован (должно быть установлено auth middleware)
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Проверяем роль пользователя
    if (req.user.role !== 'moderator' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Moderator role required.' 
      });
    }

    // Пользователь является модератором - разрешаем доступ
    next();
  } catch (error) {
    console.error('Moderator middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error in authorization' 
    });
  }
};

module.exports = moderator;
