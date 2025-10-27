const { pool } = require('../../config/database');
const OpenAI = require('openai');
const crypto = require('crypto');
const moment = require('moment');
const { getZodiacDescription } = require('./astroService');
const { sendForecast } = require('../emailService');

// Инициализация OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
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
    ja: '日本語で流暢に',
    pt: 'em português fluente e natural',
    it: 'in italiano fluente e naturale',
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

// Создать промпт для GPT с использованием открытых астрологических знаний
const createForecastPrompt = (profile, birthChart, language, level, forecastType) => {
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || `in fluent, natural ${language.toUpperCase()}`;
    
    // Текущие астрологические транзиты (можно интегрировать с астрологическими API)
    const currentDate = new Date();
    const periodDescription = getPeriodDescription(forecastType, language);
    
    const prompt = `You are a professional astrologer with deep knowledge of Western astrology, planetary transits, and birth chart interpretation.

Generate a personalized ${forecastType} astrological forecast ${languageInstruction}.

=== USER PROFILE ===
Name: ${profile.full_name || 'Dear friend'}
Birth Data:
- Sun Sign: ${birthChart.sunSign || 'Unknown'}
- Moon Sign: ${birthChart.moonSign || 'Unknown'}
- Rising/Ascendant: ${birthChart.risingSign || 'Unknown'}
- Birth Date: ${profile.birth_date}
${profile.birth_time ? `- Birth Time: ${profile.birth_time}` : ''}
- Birth Place: ${profile.birth_place_city}, ${profile.birth_place_country}

Personality & Life Context:
- Personality Style: ${profile.personality_style || 'Balanced'}
- Current Life Phase: ${profile.life_phase || 'Transition'}
- Main Interests: ${profile.focus_areas?.join(', ') || 'General life guidance'}
${profile.responses?.career_goals ? `- Career Goals: ${profile.responses.career_goals}` : ''}
${profile.responses?.life_priorities ? `- Life Priorities: ${profile.responses.life_priorities}` : ''}

=== FORECAST PERIOD ===
Type: ${forecastType.toUpperCase()}
Period: ${periodDescription}
Current Date: ${currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

=== MEMBERSHIP LEVEL: ${level} ===
${level === 'GS-I' ? 'Basic forecast - concise overview and main themes' : ''}
${level === 'GS-II' ? 'Enhanced forecast - detailed insights and specific guidance' : ''}
${level === 'GS-III' ? 'Premium forecast - comprehensive analysis with deep spiritual insights' : ''}
${level === 'GS-IV' ? 'VIP forecast - highly detailed, personalized with day-by-day breakdown' : ''}

=== STRUCTURE ===
Generate approximately ${FORECAST_LENGTHS[level]} words covering:

1. **Personal Greeting** - Address by name warmly
2. **Overall Energy** - Main astrological themes for this ${forecastType}
3. **Love & Relationships** - Heart matters, connections, communication
4. **Career & Finances** - Work opportunities, money matters, professional growth
5. **Health & Wellness** - Physical energy, mental clarity, self-care needs
6. **Spiritual Insights** - Life lessons, inner growth, cosmic messages
${level === 'GS-IV' ? '7. **Day-by-Day Guidance** - Specific advice for each day' : ''}
8. **Lucky Elements** - Best days, lucky numbers, favorable colors
9. **Advice & Affirmation** - Practical wisdom and encouraging words

=== ASTROLOGICAL KNOWLEDGE BASE ===
Use classical and modern astrology:
- Planetary positions and aspects
- Lunar phases and their influence
- Zodiac sign characteristics and rulerships
- House systems and their meanings
- Current transits and their effects
- Retrograde periods
- Eclipses and significant cosmic events

Refer to open-source astrological resources:
- Astro-Seek planetary positions
- TimePassages transit interpretations  
- Cafe Astrology sign descriptions
- Traditional astrological texts

=== TONE & STYLE ===
- Warm, mystical, yet grounded and practical
- Use "you" and "your" to personalize
- Be encouraging and empowering
- Acknowledge challenges but focus on opportunities
- Mix spiritual wisdom with actionable advice
${profile.personality_style === 'Analytical' ? '- Use logical explanations and clear structure' : ''}
${profile.personality_style === 'Creative' ? '- Use vivid imagery and metaphors' : ''}
${profile.personality_style === 'Practical' ? '- Focus on concrete steps and real-world applications' : ''}
${profile.personality_style === 'Intuitive' ? '- Emphasize feelings and inner knowing' : ''}

=== IMPORTANT REQUIREMENTS ===
- Write ENTIRELY ${languageInstruction}
- ALL text, headers, and content in ${language}
- Include specific dates when relevant
- Provide 3-5 lucky numbers
- Suggest 2-3 favorable colors
- End with: "This forecast is for entertainment and spiritual guidance. Your free will shapes your destiny."

Begin with a personalized greeting and create an inspiring, helpful forecast!`;

    return prompt;
};

// Получить описание периода
const getPeriodDescription = (forecastType, language) => {
    const now = moment();
    
    const descriptions = {
        en: {
            daily: now.format('MMMM D, YYYY'),
            weekly: `Week of ${now.format('MMMM D')} - ${now.add(6, 'days').format('MMMM D, YYYY')}`,
            biweekly: `${now.format('MMMM D')} - ${now.add(13, 'days').format('MMMM D, YYYY')}`,
            monthly: now.format('MMMM YYYY')
        },
        ru: {
            daily: now.format('D MMMM YYYY'),
            weekly: `Неделя ${now.format('D MMMM')} - ${now.add(6, 'days').format('D MMMM YYYY')}`,
            biweekly: `${now.format('D MMMM')} - ${now.add(13, 'days').format('D MMMM YYYY')}`,
            monthly: now.format('MMMM YYYY')
        }
    };
    
    return descriptions[language]?.[forecastType] || descriptions.en[forecastType];
};

// Генерировать прогноз через OpenAI
const generateWithAI = async (profile, birthChart, language, level, forecastType = 'weekly') => {
    try {
        const startTime = Date.now();
        const prompt = createForecastPrompt(profile, birthChart, language, level, forecastType);
        
        console.log(`🤖 Generating AI forecast for user ${profile.user_id} (${level}, ${language}, ${forecastType})...`);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional astrologer with expertise in Western astrology, birth chart interpretation, and cosmic guidance. You have deep knowledge of:
- Classical and modern astrology
- Planetary transits and their psychological effects
- Zodiac signs, houses, and aspects
- Lunar phases and their influence
- Open-source astrological databases (Astro-Seek, Cafe Astrology, TimePassages)

You create personalized, accurate forecasts ${languageInstruction} that blend spiritual wisdom with practical life advice. You are warm, encouraging, and empowering while remaining professional and insightful.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: FORECAST_LENGTHS[level],
            temperature: 0.8
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

As a ${birthChart.sunSign}, this week brings opportunities for growth and positive change.

**Week Overview**: The stars align in your favor, bringing fresh energy and new possibilities.

**Love & Relationships**: Communication flows easily. Express your feelings openly.

**Career & Money**: Your ${birthChart.sunSign} determination helps you overcome obstacles.

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
        
        // Получаем email пользователя
        const userResult = await client.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
        );
        const userEmail = userResult.rows[0]?.email;
        
        const birthChart = typeof profile.birth_chart_data === 'string' 
            ? JSON.parse(profile.birth_chart_data) 
            : profile.birth_chart_data;
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
                // Используем AI для всех уровней
                forecastData = await generateWithAI(profile, birthChart, language, level);
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
        
        // Отправляем email с прогнозом
        if (userEmail) {
            try {
                const emailResult = await sendForecast(
                    userEmail,
                    profile.full_name,
                    forecastData.text,
                    language
                );
                
                if (emailResult.success) {
                    await pool.query(
                        'UPDATE vector_forecasts SET delivery_status = $1, email_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
                        ['sent', forecastResult.rows[0].id]
                    );
                    console.log(`✅ Forecast email sent to ${userEmail}`);
                }
            } catch (emailError) {
                console.error('📧 Email sending failed:', emailError);
                // Не критично - прогноз уже создан
            }
        }
        
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