const { pool } = require('../../config/database');

// Частоты прогнозов по уровням (без оплат)
const FORECAST_FREQUENCIES = {
    'GS-I': 'monthly',    // 1 раз в месяц
    'GS-II': 'biweekly',  // каждые 2 недели
    'GS-III': 'weekly',   // еженедельно
    'GS-IV': 'daily'      // ежедневно
};

// Активировать подписку автоматически при наличии GS программы
const activateSubscription = async (userId, membershipLevel) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Получаем profile_id
        const profileResult = await client.query(
            'SELECT id FROM vector_profiles WHERE user_id = $1',
            [userId]
        );
        
        if (profileResult.rows.length === 0) {
            throw new Error('Profile not found. Please complete the questionnaire first.');
        }
        
        const profileId = profileResult.rows[0].id;
        const frequency = FORECAST_FREQUENCIES[membershipLevel] || 'monthly';
        
        // Вычисляем дату следующего прогноза
        const nextForecastDate = calculateNextForecastDate(new Date(), frequency);
        
        // Создаем или обновляем подписку (без оплаты)
        const subscriptionResult = await client.query(`
            INSERT INTO vector_subscriptions 
            (user_id, profile_id, membership_level, status, forecast_frequency, next_forecast_date)
            VALUES ($1, $2, $3, 'active', $4, $5)
            ON CONFLICT (user_id) 
            DO UPDATE SET
                membership_level = $3,
                status = 'active',
                forecast_frequency = $4,
                next_forecast_date = $5,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [userId, profileId, membershipLevel, frequency, nextForecastDate]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: `Vector Destiny activated! You will receive ${getFrequencyDescription(frequency)} forecasts.`,
            data: {
                subscription_id: subscriptionResult.rows[0].id,
                membership_level: membershipLevel,
                forecast_frequency: frequency,
                next_forecast_date: nextForecastDate
            }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Activate subscription error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Получить статус подписки
const getSubscriptionStatus = async (userId) => {
    try {
        const result = await pool.query(`
            SELECT 
                vs.*,
                vp.membership_level as profile_level
            FROM vector_subscriptions vs
            LEFT JOIN vector_profiles vp ON vs.user_id = vp.user_id
            WHERE vs.user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return {
                success: true,
                data: {
                    active: false,
                    status: 'none'
                }
            };
        }
        
        const subscription = result.rows[0];
        
        return {
            success: true,
            data: {
                active: subscription.status === 'active',
                status: subscription.status,
                level: subscription.membership_level,
                forecast_frequency: subscription.forecast_frequency,
                next_forecast_date: subscription.next_forecast_date,
                last_forecast_date: subscription.last_forecast_date,
                forecasts_received: subscription.forecasts_received
            }
        };
    } catch (error) {
        console.error('Get subscription status error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Обновить уровень подписки при изменении GS программы
const updateMembershipLevel = async (userId, newLevel) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const frequency = FORECAST_FREQUENCIES[newLevel] || 'monthly';
        const nextForecastDate = calculateNextForecastDate(new Date(), frequency);
        
        await client.query(`
            UPDATE vector_subscriptions 
            SET membership_level = $1,
                forecast_frequency = $2,
                next_forecast_date = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $4
        `, [newLevel, frequency, nextForecastDate, userId]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: `Membership updated to ${newLevel}. Forecast frequency: ${getFrequencyDescription(frequency)}`
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update membership error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Деактивировать подписку (когда пользователь покидает GS программу)
const deactivateSubscription = async (userId) => {
    try {
        await pool.query(
            'UPDATE vector_subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            ['inactive', userId]
        );
        
        return {
            success: true,
            message: 'Subscription deactivated'
        };
    } catch (error) {
        console.error('Deactivate subscription error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Вспомогательные функции
function calculateNextForecastDate(fromDate, frequency) {
    const date = new Date(fromDate);
    
    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'biweekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
        default:
            date.setMonth(date.getMonth() + 1);
            break;
    }
    
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getFrequencyDescription(frequency) {
    const descriptions = {
        'daily': 'daily',
        'weekly': 'weekly',
        'biweekly': 'bi-weekly',
        'monthly': 'monthly'
    };
    return descriptions[frequency] || 'monthly';
}

module.exports = {
    activateSubscription,
    getSubscriptionStatus,
    updateMembershipLevel,
    deactivateSubscription,
    calculateNextForecastDate,
    FORECAST_FREQUENCIES
};
