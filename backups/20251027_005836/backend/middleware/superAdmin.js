const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Middleware для проверки super-admin прав
const verifySuperAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const result = await pool.query(
            'SELECT id, email, role, is_blocked, is_blacklisted FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = result.rows[0];

        // Проверяем что пользователь не заблокирован
        if (user.is_blocked || user.is_blacklisted) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account is blocked' 
            });
        }

        // Проверяем что это super-admin
        if (user.role !== 'super_admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Super admin access required' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Super admin verification error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

module.exports = { verifySuperAdmin };
