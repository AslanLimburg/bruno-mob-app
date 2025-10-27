const cron = require('node-cron');
const { pool } = require('../../config/database');
const { calculateNextForecastDate } = require('./subscriptionService');

// Проверка и генерация прогнозов
async function processForecastGeneration() {
    const client = await pool.connect();
    
    try {
        console.log('🔮 Checking for forecasts to generate...');
        
        // Находим подписки, которым нужен прогноз
        const result = await client.query(`
            SELECT 
                vs.id as subscription_id,
                vs.user_id,
                vs.profile_id,
                vs.membership_level,
                vs.forecast_frequency,
                vs.next_forecast_date,
                vp.language
            FROM vector_subscriptions vs
            JOIN vector_profiles vp ON vs.profile_id = vp.id
            WHERE vs.status = 'active'
            AND vs.next_forecast_date <= CURRENT_DATE
            ORDER BY vs.next_forecast_date
        `);
        
        if (result.rows.length === 0) {
            console.log('✅ No forecasts to generate');
            return;
        }
        
        console.log(`📊 Found ${result.rows.length} subscription(s) needing forecasts`);
        
        for (const subscription of result.rows) {
            try {
                await generateAndSendForecast(subscription, client);
            } catch (error) {
                console.error(`❌ Error generating forecast for user ${subscription.user_id}:`, error);
            }
        }
        
        console.log('✅ Forecast generation completed');
        
    } catch (error) {
        console.error('❌ Process forecasts error:', error);
    } finally {
        client.release();
    }
}

// Генерация и отправка прогноза
async function generateAndSendForecast(subscription, client) {
    const { user_id, profile_id, membership_level, forecast_frequency, subscription_id } = subscription;
    
    // Получаем профиль пользователя для генерации прогноза
    const profileResult = await client.query(
        'SELECT * FROM vector_profiles WHERE id = $1',
        [profile_id]
    );
    
    if (profileResult.rows.length === 0) {
        console.log(`⚠️  Profile not found for user ${user_id}`);
        return;
    }
    
    const profile = profileResult.rows[0];
    
    // Определяем тип прогноза
    const forecastType = getForecastType(forecast_frequency);
    const today = new Date().toISOString().split('T')[0];
    
    // Генерируем контент прогноза (здесь можно интегрировать ChatGPT)
    const forecastContent = await generateForecastContent(profile, forecastType, membership_level);
    
    // Сохраняем прогноз
    const forecastResult = await client.query(`
        INSERT INTO vector_forecasts 
        (user_id, profile_id, forecast_date, forecast_type, membership_level, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, forecast_date, forecast_type) 
        DO UPDATE SET content = $6, updated_at = CURRENT_TIMESTAMP
        RETURNING id
    `, [user_id, profile_id, today, forecastType, membership_level, forecastContent]);
    
    const forecastId = forecastResult.rows[0].id;
    
    // Записываем в историю
    await client.query(`
        INSERT INTO vector_forecast_history 
        (subscription_id, user_id, forecast_id, forecast_date, forecast_type)
        VALUES ($1, $2, $3, $4, $5)
    `, [subscription_id, user_id, forecastId, today, forecastType]);
    
    // Обновляем подписку
    const nextForecastDate = calculateNextForecastDate(new Date(), forecast_frequency);
    await client.query(`
        UPDATE vector_subscriptions 
        SET last_forecast_date = CURRENT_DATE,
            next_forecast_date = $1,
            forecasts_received = forecasts_received + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `, [nextForecastDate, subscription_id]);
    
    console.log(`✅ Forecast generated for user ${user_id} (${forecastType})`);
    
    // TODO: Отправить уведомление пользователю
}

// Генерация контента прогноза через ChatGPT
async function generateForecastContent(profile, forecastType, membershipLevel) {
    const language = profile.language || 'en';
    
    // Если есть OpenAI ключ - генерируем через AI
    if (process.env.OPENAI_API_KEY) {
        try {
            const { generateForecast } = require('./forecastService');
            
            console.log(`🔮 Generating AI forecast for ${profile.full_name} (${forecastType}, ${language})...`);
            
            const result = await generateForecast(profile.user_id, forecastType);
            
            if (result.success && result.forecast) {
                return result.forecast.content;
            }
        } catch (error) {
            console.error('AI forecast error:', error);
            // Fallback на базовый шаблон
        }
    }
    
    // Базовый шаблон прогноза (если нет OpenAI или ошибка)
    const forecast = {
        type: forecastType,
        level: membershipLevel,
        generated_at: new Date().toISOString(),
        sun_sign: profile.sun_sign,
        moon_sign: profile.moon_sign,
        rising_sign: profile.rising_sign,
        period: getPeriodDescription(forecastType),
        greeting: `Dear ${profile.full_name || 'friend'},`,
        sections: {
            overview: `Your ${forecastType} ${forecastType} forecast shows positive cosmic energy aligned with your ${profile.sun_sign} sun sign.`,
            career: `Professional opportunities are highlighted. Your ${profile.moon_sign} moon helps you navigate workplace dynamics.`,
            relationships: `Connection and communication flow naturally this ${forecastType}. Open your heart to new possibilities.`,
            health: `Energy levels are balanced. Focus on ${profile.focus_areas?.includes('Health') ? 'your wellness goals' : 'maintaining good habits'}.`,
            finance: `Financial matters stabilize. Good time for ${profile.focus_areas?.includes('Finance') ? 'strategic planning' : 'budgeting'}.`,
            spiritual: `Your spiritual path is illuminated. Trust your ${profile.personality_style === 'Intuitive' ? 'inner wisdom' : 'journey'}.`
        },
        lucky_numbers: generateLuckyNumbers(),
        lucky_colors: generateLuckyColors(),
        advice: `Embrace the cosmic flow and trust in your path. Your ${profile.sun_sign} energy is your superpower this ${forecastType}.`,
        disclaimer: 'This forecast is for entertainment and spiritual guidance. Your free will shapes your destiny.'
    };
    
    return forecast;
}

// Вспомогательные функции
function getForecastType(frequency) {
    const types = {
        'daily': 'daily',
        'weekly': 'weekly',
        'biweekly': 'biweekly',
        'monthly': 'monthly'
    };
    return types[frequency] || 'monthly';
}

function getPeriodDescription(type) {
    const now = new Date();
    const descriptions = {
        'daily': `${now.toLocaleDateString()}`,
        'weekly': `Week of ${now.toLocaleDateString()}`,
        'biweekly': `Two weeks starting ${now.toLocaleDateString()}`,
        'monthly': `${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`
    };
    return descriptions[type] || 'Unknown period';
}

function generateLuckyNumbers() {
    return Array.from({ length: 5 }, () => Math.floor(Math.random() * 100) + 1);
}

function generateLuckyColors() {
    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Gold', 'Silver', 'White'];
    return colors.sort(() => 0.5 - Math.random()).slice(0, 3);
}

// Запуск планировщика
function startForecastScheduler() {
    console.log('✅ Vector Destiny Forecast Scheduler initialized');
    
    // Проверяем каждый день в 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log('🕐 Vector Destiny Forecast Scheduler started');
        await processForecastGeneration();
        console.log('🕐 Vector Destiny Forecast Scheduler completed');
    });
    
    // Сразу проверяем при запуске (для тестирования)
    // processForecastGeneration();
}

module.exports = {
    startForecastScheduler,
    processForecastGeneration
};

