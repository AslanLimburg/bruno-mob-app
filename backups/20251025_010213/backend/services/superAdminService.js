const pool = require('../config/database');
const { logAdminActivity } = require('../utils/logger');
const { sendBlockNotification, sendUnblockNotification } = require('./emailService');

// ==========================================
// DASHBOARD - Общая статистика
// ==========================================

const getDashboardStats = async () => {
    try {
        // Общее количество пользователей
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
        
        // Активные пользователи (за последние 7 дней)
        const activeUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE last_login_at > NOW() - INTERVAL \'7 days\''
        );
        
        // Заблокированные аккаунты
        const blockedUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE is_blocked = true'
        );
        
        // В черном списке
        const blacklistedUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE is_blacklisted = true'
        );
        
        // Новые регистрации (за последние 7 дней)
        const newUsers = await pool.query(
            'SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL \'7 days\''
        );
        
        // Общий объем BRT в системе
        const totalBRT = await pool.query(
            'SELECT SUM(balance) as total FROM user_balances WHERE crypto = \'BRT\''
        );
        
        // Транзакции за последние 7 дней
        const recentTransactions = await pool.query(
            'SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL \'7 days\''
        );
        
        // Club Avalanche участники (если таблица существует)
        let clubMembers = { rows: [] };
        try {
        clubMembers = await pool.query(`
        SELECT 
            program,
            COUNT(*) as count
        FROM club_avalanche_memberships 
        WHERE status = 'active'
        GROUP BY program
    `);
} catch (err) {
    console.log('Club Avalanche table not found, skipping stats');
}
        
        return {
            success: true,
            data: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                activeUsers: parseInt(activeUsers.rows[0].count),
                blockedUsers: parseInt(blockedUsers.rows[0].count),
                blacklistedUsers: parseInt(blacklistedUsers.rows[0].count),
                newUsers: parseInt(newUsers.rows[0].count),
                totalBRT: parseFloat(totalBRT.rows[0].total || 0),
                recentTransactions: parseInt(recentTransactions.rows[0].count),
                clubMembers: clubMembers.rows
            }
        };
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        return { success: false, message: error.message };
    }
};

// ==========================================
// USERS MANAGEMENT - Управление пользователями
// ==========================================

// Получить список всех пользователей с фильтрами
const getAllUsers = async (filters = {}) => {
    try {
        let query = `
            SELECT 
                u.id,
                u.email,
                u.role,
                u.account_status,
                u.is_blocked,
                u.is_blacklisted,
                u.blocked_reason,
                u.blacklist_reason,
                u.last_login_at,
                u.created_at,
                u.referrer_id,
                COALESCE(ub.balance, 0) as brt_balance
            FROM users u
            LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.crypto = 'BRT'
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;
        
        // Фильтры
        if (filters.search) {
            query += ` AND (u.email ILIKE $${paramCount} OR u.id::text ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
            paramCount++;
        }
        
        if (filters.status) {
            query += ` AND u.account_status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }
        
        if (filters.role) {
            query += ` AND u.role = $${paramCount}`;
            params.push(filters.role);
            paramCount++;
        }
        
        if (filters.isBlocked !== undefined) {
            query += ` AND u.is_blocked = $${paramCount}`;
            params.push(filters.isBlocked);
            paramCount++;
        }
        
        if (filters.isBlacklisted !== undefined) {
            query += ` AND u.is_blacklisted = $${paramCount}`;
            params.push(filters.isBlacklisted);
            paramCount++;
        }
        
        // Сортировка
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY u.${sortBy} ${sortOrder}`;
        
        // Пагинация
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const offset = (page - 1) * limit;
        
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Общее количество
        const countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const countResult = await pool.query(countQuery);
        
        return {
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page,
                limit,
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        };
    } catch (error) {
        console.error('Get all users error:', error);
        return { success: false, message: error.message };
    }
};

// Получить детальную информацию о пользователе
const getUserDetails = async (userId) => {
    try {
        // Основная информация
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return { success: false, message: 'User not found' };
        }
        
        const user = userResult.rows[0];
        
        // Балансы
        const balances = await pool.query(
            'SELECT crypto, balance FROM user_balances WHERE user_id = $1',
            [userId]
        );
        
        // Транзакции (последние 20)
        const transactions = await pool.query(
            `SELECT * FROM transactions 
             WHERE from_user_id = $1 OR to_user_id = $1 
             ORDER BY created_at DESC LIMIT 20`,
            [userId]
        );
        
        // Рефералы
        const referrals = await pool.query(
            'SELECT id, email, created_at FROM users WHERE referrer_id = $1',
            [userId]
        );
        
        // Club Avalanche membership
        const membership = await pool.query(
            'SELECT * FROM club_avalanche_memberships WHERE user_id = $1',
            [userId]
        );
        
        return {
            success: true,
            data: {
                user,
                balances: balances.rows,
                transactions: transactions.rows,
                referrals: referrals.rows,
                membership: membership.rows
            }
        };
    } catch (error) {
        console.error('Get user details error:', error);
        return { success: false, message: error.message };
    }
};

// Заблокировать пользователя
const blockUser = async (adminId, userId, reason, ipAddress) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Получаем email пользователя
        const userResult = await client.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        
        const userEmail = userResult.rows[0].email;
        
        // Блокируем пользователя
        await client.query(
            `UPDATE users 
             SET is_blocked = true, 
                 blocked_at = CURRENT_TIMESTAMP, 
                 blocked_reason = $1,
                 account_status = 'blocked'
             WHERE id = $2`,
            [reason, userId]
        );
        
        // Логируем действие
        await logAdminActivity(
            adminId,
            'BLOCK_USER',
            'user',
            userId,
            `User blocked. Reason: ${reason}`,
            { reason },
            ipAddress
        );
        
        await client.query('COMMIT');
        
        // Отправляем email уведомление
        await sendBlockNotification(userEmail, reason, false);
        
        return { success: true, message: 'User blocked successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Block user error:', error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
};

// Добавить в черный список
const blacklistUser = async (adminId, userId, reason, ipAddress) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userResult = await client.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        
        const userEmail = userResult.rows[0].email;
        
        // Добавляем в черный список
        await client.query(
            `UPDATE users 
             SET is_blacklisted = true, 
                 blacklist_reason = $1,
                 account_status = 'blacklisted'
             WHERE id = $2`,
            [reason, userId]
        );
        
        // Добавляем email в blacklist таблицу
        await client.query(
            `INSERT INTO blacklist (blacklist_type, value, reason, added_by)
             VALUES ('email', $1, $2, $3)
             ON CONFLICT (value) DO NOTHING`,
            [userEmail, reason, adminId]
        );
        
        await logAdminActivity(
            adminId,
            'BLACKLIST_USER',
            'user',
            userId,
            `User blacklisted. Reason: ${reason}`,
            { reason },
            ipAddress
        );
        
        await client.query('COMMIT');
        
        // Отправляем email
        await sendBlockNotification(userEmail, reason, true);
        
        return { success: true, message: 'User blacklisted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Blacklist user error:', error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
};

// Разблокировать пользователя
const unblockUser = async (adminId, userId, ipAddress) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userResult = await client.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        
        const userEmail = userResult.rows[0].email;
        
        // Разблокируем
        await client.query(
            `UPDATE users 
             SET is_blocked = false, 
                 blocked_at = NULL, 
                 blocked_reason = NULL,
                 account_status = 'active'
             WHERE id = $1`,
            [userId]
        );
        
        await logAdminActivity(
            adminId,
            'UNBLOCK_USER',
            'user',
            userId,
            'User unblocked',
            {},
            ipAddress
        );
        
        await client.query('COMMIT');
        
        // Отправляем email
        await sendUnblockNotification(userEmail);
        
        return { success: true, message: 'User unblocked successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Unblock user error:', error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
};

// Удалить пользователя (soft delete)
const deleteUser = async (adminId, userId, ipAddress) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Помечаем как удаленный
        await client.query(
            `UPDATE users 
             SET account_status = 'deleted',
                 email = email || '_deleted_' || id
             WHERE id = $1`,
            [userId]
        );
        
        await logAdminActivity(
            adminId,
            'DELETE_USER',
            'user',
            userId,
            'User deleted (soft delete)',
            {},
            ipAddress
        );
        
        await client.query('COMMIT');
        
        return { success: true, message: 'User deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete user error:', error);
        return { success: false, message: error.message };
    } finally {
        client.release();
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    getUserDetails,
    blockUser,
    blacklistUser,
    unblockUser,
    deleteUser
};