const pool = require('../config/database');

// Логирование действий администратора
const logAdminActivity = async (adminId, actionType, targetType, targetId, description, metadata = {}, ipAddress = null) => {
    try {
        await pool.query(
            `INSERT INTO admin_activity_logs 
            (admin_id, action_type, target_type, target_id, description, metadata, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [adminId, actionType, targetType, targetId, description, JSON.stringify(metadata), ipAddress]
        );
    } catch (error) {
        console.error('Failed to log admin activity:', error);
    }
};

// Логирование системных событий
const logSystemEvent = async (logLevel, logType, message, userId = null, metadata = {}, ipAddress = null) => {
    try {
        await pool.query(
            `INSERT INTO system_logs 
            (log_level, log_type, message, user_id, metadata, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [logLevel, logType, message, userId, JSON.stringify(metadata), ipAddress]
        );
    } catch (error) {
        console.error('Failed to log system event:', error);
    }
};

// Очистка старых логов (7 дней)
const cleanupOldLogs = async () => {
    try {
        await pool.query('SELECT cleanup_old_logs()');
        console.log('Old logs cleaned up successfully');
    } catch (error) {
        console.error('Failed to cleanup old logs:', error);
    }
};

module.exports = {
    logAdminActivity,
    logSystemEvent,
    cleanupOldLogs
};