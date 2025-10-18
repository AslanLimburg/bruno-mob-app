const pool = require('../../config/database');
const moment = require('moment');

// Цены подписок в BRT
const SUBSCRIPTION_PRICES = {
    'GS-I': 1,
    'GS-II': 2,
    'GS-III': 3,
    'GS-IV': 5
};

// Длительность trial (7 дней)
const TRIAL_DAYS = 7;

// Начать trial подписку
const startTrialSubscription = async (userId, membershipLevel) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Проверяем не использовал ли уже trial
        const trialCheck = await client.query(
            'SELECT trial_used FROM vector_subscriptions WHERE user_id = $1',
            [userId]
        );
        
        if (trialCheck.rows.length > 0 && trialCheck.rows[0].trial_used) {
            throw new Error('Trial period already used');
        }
        
        // Получаем profile_id
        const profileResult = await client.query(
            'SELECT id FROM vector_profiles WHERE user_id = $1',
            [userId]
        );
        
        if (profileResult.rows.length === 0) {
            throw new Error('Profile not found. Please complete the questionnaire first.');
        }
        
        const profileId = profileResult.rows[0].id;
        const price = SUBSCRIPTION_PRICES[membershipLevel];
        const trialEndsAt = moment().add(TRIAL_DAYS, 'days').toDate();
        
        // Создаем подписку с trial
        await client.query(`
            INSERT INTO vector_subscriptions 
            (user_id, profile_id, membership_level, status, price_brt, 
             trial_started_at, trial_ends_at, trial_used, next_billing_date)
            VALUES ($1, $2, $3, 'trial', $4, CURRENT_TIMESTAMP, $5, true, $5)
            ON CONFLICT (user_id) 
            DO UPDATE SET
                membership_level = $3,
                status = 'trial',
                price_brt = $4,
                trial_started_at = CURRENT_TIMESTAMP,
                trial_ends_at = $5,
                trial_used = true,
                next_billing_date = $5,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, profileId, membershipLevel, price, trialEndsAt]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: '7-day free trial activated!',
            trial_ends_at: trialEndsAt,
            next_billing_date: trialEndsAt,
            price_after_trial: price
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Start trial error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Подписаться (после trial или напрямую)
const subscribe = async (userId, membershipLevel) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const price = SUBSCRIPTION_PRICES[membershipLevel];
        
        // Проверяем баланс BRT
        const balanceResult = await client.query(
            'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
            [userId, 'BRT']
        );
        
        if (balanceResult.rows.length === 0 || parseFloat(balanceResult.rows[0].balance) < price) {
            throw new Error(`Insufficient BRT balance. Need ${price} BRT.`);
        }
        
        // Списываем BRT
        await client.query(
            'UPDATE user_balances SET balance = balance - $1 WHERE user_id = $2 AND crypto = $3',
            [price, userId, 'BRT']
        );
        
        // Создаем транзакцию
        const transactionResult = await client.query(`
            INSERT INTO transactions 
            (from_user_id, crypto, amount, type, status, metadata)
            VALUES ($1, 'BRT', $2, 'vector_subscription', 'completed', $3)
            RETURNING id
        `, [userId, price, JSON.stringify({ membership_level: membershipLevel })]);
        
        const transactionId = transactionResult.rows[0].id;
        
        // Получаем profile_id
        const profileResult = await client.query(
            'SELECT id FROM vector_profiles WHERE user_id = $1',
            [userId]
        );
        
        const profileId = profileResult.rows[0]?.id;
        const nextBillingDate = moment().add(1, 'month').format('YYYY-MM-DD');
        
        // Создаем или обновляем подписку
        const subscriptionResult = await client.query(`
            INSERT INTO vector_subscriptions 
            (user_id, profile_id, membership_level, status, price_brt, 
             last_billing_date, next_billing_date, total_paid_brt)
            VALUES ($1, $2, $3, 'active', $4, CURRENT_DATE, $5, $4)
            ON CONFLICT (user_id) 
            DO UPDATE SET
                membership_level = $3,
                status = 'active',
                price_brt = $4,
                last_billing_date = CURRENT_DATE,
                next_billing_date = $5,
                total_paid_brt = vector_subscriptions.total_paid_brt + $4,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [userId, profileId, membershipLevel, price, nextBillingDate]);
        
        const subscriptionId = subscriptionResult.rows[0].id;
        
        // Записываем в историю платежей
        await client.query(`
            INSERT INTO vector_billing_history 
            (subscription_id, user_id, amount_brt, transaction_id, 
             billing_period_start, billing_period_end, billing_type, status)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'subscription', 'completed')
        `, [subscriptionId, userId, price, transactionId, nextBillingDate]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            message: 'Subscription activated!',
            next_billing_date: nextBillingDate,
            amount_paid: price
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Subscribe error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Отменить подписку
const cancelSubscription = async (userId) => {
    try {
        const result = await pool.query(
            `UPDATE vector_subscriptions 
             SET status = 'cancelled', auto_renew = false, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
             RETURNING *`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'No active subscription found'
            };
        }
        
        return {
            success: true,
            message: 'Subscription cancelled. You can still use it until the end of billing period.',
            valid_until: result.rows[0].next_billing_date
        };
    } catch (error) {
        console.error('Cancel subscription error:', error);
        return {
            success: false,
            message: error.message
        };
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
                    status: 'none',
                    trial_available: true
                }
            };
        }
        
        const subscription = result.rows[0];
        
        return {
            success: true,
            data: {
                active: subscription.status === 'active' || subscription.status === 'trial',
                status: subscription.status,
                level: subscription.membership_level,
                price: parseFloat(subscription.price_brt),
                next_billing_date: subscription.next_billing_date,
                trial_ends_at: subscription.trial_ends_at,
                auto_renew: subscription.auto_renew,
                trial_available: !subscription.trial_used,
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

// Получить историю платежей
const getBillingHistory = async (userId) => {
    try {
        const result = await pool.query(`
            SELECT * FROM vector_billing_history
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        
        return {
            success: true,
            data: result.rows
        };
    } catch (error) {
        console.error('Get billing history error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = {
    startTrialSubscription,
    subscribe,
    cancelSubscription,
    getSubscriptionStatus,
    getBillingHistory,
    SUBSCRIPTION_PRICES,
    TRIAL_DAYS
};