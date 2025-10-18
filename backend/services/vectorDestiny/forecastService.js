const pool = require('../../config/database');
const OpenAI = require('openai');
const crypto = require('crypto');
const moment = require('moment');
const { getZodiacDescription } = require('./astroService');

// Инициализация OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

// Длина прогноза по уровням (в токенах)
const FORECAST_LENGTHS = {
    'GS-I': 300,   // Basic
    'GS-II': 500,  // Personal
    'GS-III': 800, // Premium
    'GS-IV': 1200  // VIP
};

// Языковые инструкции для GPT
const LANGUAGE_INSTRUCTIONS = {
    en: 'in fluent, natural English',
    ru: 'на русском языке, естественно и красиво',
    ar: 'باللغة العربية بطلاقة وأسلوب جميل',
    es: 'en español fluido y natural',
    zh: '用流利自然的中文',
    hi: 'प्राकृतिक और सुंदर हिंदी में',
    fr: 'en français fluide et naturel',
    de: 'auf fließendem und natürlichem Deutsch'
};

// Генерация кэш ключа
const generateCacheKey = (profileData) => {
    const dataStr = JSON.stringify({
        sun_sign: profileData.sun_sign,
        moon_sign: profileData.moon_sign,
        rising_sign: profileData.rising_sign,
        personality_style: profileData.personality_style,
        focus_areas: profileData.focus_areas,
        week: moment().week() // меняется каждую неделю
    });
    
    return crypto.createHash('md5').update(dataStr).digest('hex');
};

// Проверить кэш
const checkCache = async (cacheKey, language) => {
    try {
        const result = await pool.query(`
            SELECT * FROM vector_forecasts 
            WHERE cache_key = $1 
            AND language = $2
            AND created_at > NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC 
            LIMIT 1
        `, [cacheKey, language]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        
        return null;
    } catch (error) {
        console.error('Cache check error:', error);
        return null;
    }
};

// Создать промпт для GPT
const createForecastPrompt = (profile, birthChart, language, level) => {
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['en'];
    
    const prompt = `You are a professional, compassionate astrologer. Generate a personalized weekly forecast ${languageInstruction}.

BIRTH CHART:
- Name: ${profile.full_name}
- Sun Sign: ${birthChart.sun_sign} (${getZodiacDescription(birthChart.sun_sign)})
- Moon Sign: ${birthChart.moon_sign}${birthChart.rising_sign ? `\n- Rising Sign: ${birthChart.rising_sign}` : ''}

PERSONALITY:
- Style: ${profile.personality_style}
- Life Phase: ${profile.life_phase}
- Focus Areas: ${profile.focus_areas?.join(', ')}
${profile.responses ? `- Approach to Life: ${profile.responses.life_approach || 'Balanced'}` : ''}

FORECAST DETAILS:
Generate a ${level} level forecast (${FORECAST_LENGTHS[level]} words):

1. **Week Overview** - What energy dominates this week?
2. **Love & Relationships** - Romantic connections and partnerships
3. **Career & Money** - Professional opportunities and finances
4. **Health & Wellness** - Physical and mental wellbeing
5. **Spiritual Guidance** - Inner growth and life lessons
6. **Lucky Days & Advice** - Best days for important activities

TONE & STYLE:
- Warm, encouraging, and mystical yet practical
- Use "you" and "your" to make it personal
- Be specific but positive
- Balance spirituality with real-world advice
${profile.personality_style === 'practical' ? '- Focus on actionable advice' : ''}
${profile.personality_style === 'spiritual' ? '- Include deeper spiritual insights' : ''}

IMPORTANT: 
- Write ENTIRELY in ${language}
- All sections, headers, and content must be in ${language}
- Be encouraging and supportive
- Add a disclaimer at the end: "This forecast is for entertainment purposes only."

Start with a warm greeting using their name.`;

    return prompt;
};

// Генерировать прогноз через OpenAI
const generateWithAI = async (profile, birthChart, language, level) => {
    try {
        const startTime = Date.now();
        const prompt = createForecastPrompt(profile, birthChart, language, level);
        
        console.log(`🤖 Generating AI forecast for user ${profile.user_id} (${level}, ${language})...`);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a wise, compassionate astrologer who speaks ${language} fluently. You provide personalized, encouraging guidance.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: FORECAST_LENGTHS[level],
            temperature: 0.7
        });
        
        const generationTime = Date.now() - startTime;
        const forecastText = response.choices[0].message.content;
        const tokensUsed = response.usage.total_tokens;
        
        console.log(`✅ AI forecast generated in ${generationTime}ms, ${tokensUsed} tokens used`);
        
        return {
            text: forecastText,
            tokensUsed,
            generationTime,
            model: 'gpt-3.5-turbo'
        };
        
    } catch (error) {
        console.error('OpenAI generation error:', error);
        throw error;
    }
};

// Генерировать шаблонный прогноз (fallback)
const generateTemplate = (profile, birthChart, language) => {
    // Упрощенный шаблон на английском (можно расширить)
    const template = `Dear ${profile.full_name},

As a ${birthChart.sun_sign}, this week brings opportunities for growth and positive change.

**Week Overview**: The stars align in your favor, bringing fresh energy and new possibilities.

**Love & Relationships**: Communication flows easily. Express your feelings openly.

**Career & Money**: Your ${birthChart.sun_sign} determination helps you overcome obstacles.

**Health & Wellness**: Take time for self-care and rest.

**Spiritual Guidance**: Trust your intuition and inner wisdom.

**Lucky Days**: Tuesday and Friday are especially favorable.

Remember: The universe supports your journey.

*This forecast is for entertainment purposes only.*`;

    return {
        text: template,
        tokensUsed: 0,
        generationTime: 0,
        model: 'template'
    };
};

// Главная функция - генерировать прогноз
const generateForecast = async (userId) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Получаем профиль
        const profileResult = await client.query(
            'SELECT * FROM vector_profiles WHERE user_id = $1',
            [userId]
        );
        
        if (profileResult.rows.length === 0) {
            throw new Error('Profile not found');
        }
        
        const profile = profileResult.rows[0];
        const birthChart = profile.birth_chart_data;
        const language = profile.language || 'en';
        const level = profile.membership_level || 'GS-I';
        
        // Получаем подписку
        const subscriptionResult = await client.query(
            'SELECT * FROM vector_subscriptions WHERE user_id = $1',
            [userId]
        );
        
        if (subscriptionResult.rows.length === 0) {
            throw new Error('No active subscription');
        }
        
        const subscription = subscriptionResult.rows[0];
        
        if (subscription.status !== 'active' && subscription.status !== 'trial') {
            throw new Error('Subscription is not active');
        }
        
        // Проверяем кэш
        const cacheKey = generateCacheKey(profile);
        const cached = await checkCache(cacheKey, language);
        
        let forecastData;
        
        if (cached) {
            console.log(`📦 Using cached forecast for user ${userId}`);
            forecastData = {
                text: cached.forecast_text,
                tokensUsed: 0,
                generationTime: 0,
                model: 'cached'
            };
        } else {
            // Генерируем новый прогноз
            try {
                // Используем AI для GS-III и GS-IV, шаблоны для остальных
                if (level === 'GS-III' || level === 'GS-IV') {
                    forecastData = await generateWithAI(profile, birthChart, language, level);
                } else {
                    forecastData = generateTemplate(profile, birthChart, language);
                }
            } catch (aiError) {
                console.error('AI generation failed, using template:', aiError);
                forecastData = generateTemplate(profile, birthChart, language);
            }
        }
        
        // Создаем краткое резюме (первые 200 символов)
        const summary = forecastData.text.substring(0, 200) + '...';
        
        // Период прогноза (текущая неделя)
        const periodStart = moment().startOf('week').format('YYYY-MM-DD');
        const periodEnd = moment().endOf('week').format('YYYY-MM-DD');
        
        // Сохраняем прогноз
        const forecastResult = await client.query(`
            INSERT INTO vector_forecasts (
                user_id, profile_id, subscription_id, forecast_level,
                forecast_text, summary, language,
                used_ai, ai_model, tokens_used, generation_time_ms,
                forecast_period_start, forecast_period_end, cache_key,
                delivery_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
            RETURNING *
        `, [
            userId,
            profile.id,
            subscription.id,
            level,
            forecastData.text,
            summary,
            language,
            forecastData.model !== 'template' && forecastData.model !== 'cached',
            forecastData.model,
            forecastData.tokensUsed,
            forecastData.generationTime,
            periodStart,
            periodEnd,
            cacheKey
        ]);
        
        // Обновляем счетчик прогнозов
        await client.query(
            'UPDATE vector_subscriptions SET forecasts_received = forecasts_received + 1 WHERE user_id = $1',
            [userId]
        );
        
        await client.query('COMMIT');
        
        return {
            success: true,
            data: forecastResult.rows[0]
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Generate forecast error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Получить прогноз пользователя
const getUserForecast = async (userId, forecastId) => {
    try {
        let query = 'SELECT * FROM vector_forecasts WHERE user_id = $1';
        let params = [userId];
        
        if (forecastId) {
            query += ' AND id = $2';
            params.push(forecastId);
        } else {
            query += ' ORDER BY created_at DESC LIMIT 1';
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'Forecast not found'
            };
        }
        
        // Отмечаем как прочитанный
        if (!result.rows[0].read_at) {
            await pool.query(
                'UPDATE vector_forecasts SET read_at = CURRENT_TIMESTAMP WHERE id = $1',
                [result.rows[0].id]
            );
        }
        
        return {
            success: true,
            data: result.rows[0]
        };
    } catch (error) {
        console.error('Get forecast error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = {
    generateForecast,
    getUserForecast,
    generateCacheKey,
    FORECAST_LENGTHS
};