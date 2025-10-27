const pool = require('../../config/database');
const moment = require('moment');
const { sendEmail } = require('../emailService');

// Обработка окончания trial периодов
const processTrialEndings = async () => {
    console.log('🔍 Checking trial periods...');
    
    try {
        // Получаем подписки где trial заканчивается сегодня
        const result = await pool.query(`
            SELECT 
                vs.*,
                u.email,
                ub.balance as brt_balance
            FROM vector_subscriptions vs
            JOIN users u ON vs.user_id = u.id
            LEFT JOIN user_balances ub ON vs.user_id = ub.user_id AND ub.crypto = 'BRT'
            WHERE vs.status = 'trial'
            AND vs.trial_ends_at::date <= CURRENT_DATE
            AND vs.auto_renew = true
        `);
        
        console.log(`📋 Found ${result.rows.length} trials ending today`);
        
        for (const subscription of result.rows) {
            try {
                // Проверяем баланс
                const balance = parseFloat(subscription.brt_balance || 0);
                const price = parseFloat(subscription.price_brt);
                
                if (balance < price) {
                    // Недостаточно средств - suspend
                    await pool.query(
                        'UPDATE vector_subscriptions SET status = $1 WHERE id = $2',
                        ['suspended', subscription.id]
                    );
                    
                    // Уведомление
                    console.log(`📧 Sending trial end notification to ${subscription.email}`);
                    await sendEmail({
                        to: subscription.email,
                        subject: 'Vector of Destiny - Trial Ended',
                        template: 'trial_insufficient_funds',
                        data: {
                            amount: price,
                            balance: balance
                        }
                    });
                    
                    continue;
                }
                
                // Списываем BRT
                await pool.query(
                    'UPDATE user_balances SET balance = balance - $1 WHERE user_id = $2 AND crypto = $3',
                    [price, subscription.user_id, 'BRT']
                );
                
                // Создаем транзакцию
                const transactionResult = await pool.query(`
                    INSERT INTO transactions 
                    (from_user_id, crypto, amount, type, status, metadata)
                    VALUES ($1, 'BRT', $2, 'vector_subscription_trial_convert', 'completed', $3)
                    RETURNING id
                `, [
                    subscription.user_id,
                    price,
                    JSON.stringify({ subscription_id: subscription.id })
                ]);
                
                // Конвертируем в active подписку
                const nextBilling = moment().add(1, 'month').format('YYYY-MM-DD');
                
                await pool.query(`
                    UPDATE vector_subscriptions
                    SET status = 'active',
                        last_billing_date = CURRENT_DATE,
                        next_billing_date = $1,
                        total_paid_brt = total_paid_brt + $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                `, [nextBilling, price, subscription.id]);
                
                // Записываем в историю
                await pool.query(`
                    INSERT INTO vector_billing_history
                    (subscription_id, user_id, amount_brt, transaction_id,
                     billing_period_start, billing_period_end, billing_type, status)
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'trial_end', 'completed')
                `, [
                    subscription.id,
                    subscription.user_id,
                    price,
                    transactionResult.rows[0].id,
                    nextBilling
                ]);
                
                console.log(`✅ Trial converted to active for user ${subscription.user_id}`);
                
                // Уведомление об успешной конвертации
                await sendEmail({
                    to: subscription.email,
                    subject: 'Vector of Destiny - Subscription Activated',
                    template: 'trial_converted',
                    data: {
                        amount: price,
                        next_billing: nextBilling
                    }
                });
                
            } catch (error) {
                console.error(`❌ Failed to process trial for subscription ${subscription.id}:`, error);
            }
        }
        
        console.log('✅ Trial processing completed');
        
    } catch (error) {
        console.error('❌ Process trial endings error:', error);
    }
};

// Обработка ежемесячных продлений
const processSubscriptionRenewals = async () => {
    console.log('🔍 Processing subscription renewals...');
    
    try {
        // Получаем подписки для renewal (сегодня = billing date)
        const result = await pool.query(`
            SELECT 
                vs.*,
                u.email,
                ub.balance as brt_balance
            FROM vector_subscriptions vs
            JOIN users u ON vs.user_id = u.id
            LEFT JOIN user_balances ub ON vs.user_id = ub.user_id AND ub.crypto = 'BRT'
            WHERE vs.status = 'active'
            AND vs.next_billing_date <= CURRENT_DATE
            AND vs.auto_renew = true
        `);
        
        console.log(`📋 Found ${result.rows.length} subscriptions to renew`);
        
        for (const subscription of result.rows) {
            try {
                const balance = parseFloat(subscription.brt_balance || 0);
                const price = parseFloat(subscription.price_brt);
                
                if (balance < price) {
                    // Недостаточно средств - suspend
                    await pool.query(
                        'UPDATE vector_subscriptions SET status = $1 WHERE id = $2',
                        ['suspended', subscription.id]
                    );
                    
                    console.log(`⚠️ Subscription ${subscription.id} suspended - insufficient funds`);
                    
                    await sendEmail({
                        to: subscription.email,
                        subject: 'Vector of Destiny - Payment Failed',
                        template: 'subscription_suspended',
                        data: {
                            amount: price,
                            balance: balance
                        }
                    });
                    
                    continue;
                }
                
                // Списываем BRT
                await pool.query(
                    'UPDATE user_balances SET balance = balance - $1 WHERE user_id = $2 AND crypto = $3',
                    [price, subscription.user_id, 'BRT']
                );
                
                // Создаем транзакцию
                const transactionResult = await pool.query(`
                    INSERT INTO transactions 
                    (from_user_id, crypto, amount, type, status, metadata)
                    VALUES ($1, 'BRT', $2, 'vector_subscription_renewal', 'completed', $3)
                    RETURNING id
                `, [
                    subscription.user_id,
                    price,
                    JSON.stringify({ subscription_id: subscription.id })
                ]);
                
                // Обновляем подписку
                const nextBilling = moment().add(1, 'month').format('YYYY-MM-DD');
                
                await pool.query(`
                    UPDATE vector_subscriptions
                    SET last_billing_date = CURRENT_DATE,
                        next_billing_date = $1,
                        total_paid_brt = total_paid_brt + $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                `, [nextBilling, price, subscription.id]);
                
                // Записываем в историю
                await pool.query(`
                    INSERT INTO vector_billing_history
                    (subscription_id, user_id, amount_brt, transaction_id,
                     billing_period_start, billing_period_end, billing_type, status)
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'renewal', 'completed')
                `, [
                    subscription.id,
                    subscription.user_id,
                    price,
                    transactionResult.rows[0].id,
                    nextBilling
                ]);
                
                console.log(`✅ Subscription renewed for user ${subscription.user_id}`);
                
                // Генерируем новый прогноз
                const { generateForecast } = require('./forecastService');
                await generateForecast(subscription.user_id);
                
            } catch (error) {
                console.error(`❌ Failed to renew subscription ${subscription.id}:`, error);
            }
        }
        
        console.log('✅ Subscription renewals completed');
        
    } catch (error) {
        console.error('❌ Process renewals error:', error);
    }
};

// Запуск scheduler
const startBillingScheduler = () => {
    const schedule = require('node-cron');
    
    // Запускаем каждый день в 00:00
    schedule.schedule('0 0 * * *', async () => {
        console.log('\n🕐 Vector Destiny Billing Scheduler started');
        await processTrialEndings();
        await processSubscriptionRenewals();
        console.log('🕐 Vector Destiny Billing Scheduler completed\n');
    });
    
    console.log('✅ Vector Destiny Billing Scheduler initialized (runs daily at 00:00)');
};

module.exports = {
    startBillingScheduler,
    processTrialEndings,
    processSubscriptionRenewals
};