const { pool } = require('../../config/database');
const NodeGeocoder = require('node-geocoder');
const { calculateBirthChart } = require('./astroService');

// Настройка геокодера (бесплатный OpenStreetMap)
const geocoder = NodeGeocoder({
    provider: 'openstreetmap'
});

// Получить координаты по городу
const getCoordinates = async (city, country) => {
    try {
        const query = `${city}, ${country}`;
        const results = await geocoder.geocode(query);
        
        if (results && results.length > 0) {
            return {
                latitude: results[0].latitude,
                longitude: results[0].longitude,
                timezone: results[0].timezone || 'UTC'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Создать или обновить профиль
const createOrUpdateProfile = async (userId, profileData) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const {
            full_name,
            gender,
            birth_date,
            birth_time,
            birth_place_city,
            birth_place_country,
            focus_areas,
            life_phase,
            responses,
            language
        } = profileData;
        
        // Получаем координаты
        const coordinates = await getCoordinates(birth_place_city, birth_place_country);
        
        if (!coordinates) {
            throw new Error('Could not find coordinates for birth place');
        }
        
        // Вычисляем натальную карту
        const birthChartData = {
            birth_date,
            birth_time,
            birth_latitude: coordinates.latitude,
            birth_longitude: coordinates.longitude,
            birth_timezone: coordinates.timezone
        };
        
        const birthChart = await calculateBirthChart(birthChartData);
        
        if (!birthChart.success) {
            throw new Error('Failed to calculate birth chart');
        }
        
        // Определяем стиль личности (упрощенно)
        const personality_style = determinePersonalityStyle(responses);
        
        // Получаем уровень членства
        const membershipResult = await client.query(`
            SELECT program FROM gs_memberships 
            WHERE user_id = $1 AND status = 'active'
            ORDER BY purchase_date DESC LIMIT 1
        `, [userId]);
        
        const membership_level = membershipResult.rows[0]?.program || 'GS-I';
        
        // Создаем или обновляем профиль
        const result = await client.query(`
            INSERT INTO vector_profiles (
                user_id, full_name, gender, birth_date, birth_time,
                birth_place_city, birth_place_country,
                birth_latitude, birth_longitude, birth_timezone,
                sun_sign, moon_sign, rising_sign, birth_chart_data,
                responses, focus_areas, life_phase, personality_style,
                membership_level, language
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (user_id) 
            DO UPDATE SET
                full_name = $2,
                gender = $3,
                birth_date = $4,
                birth_time = $5,
                birth_place_city = $6,
                birth_place_country = $7,
                birth_latitude = $8,
                birth_longitude = $9,
                birth_timezone = $10,
                sun_sign = $11,
                moon_sign = $12,
                rising_sign = $13,
                birth_chart_data = $14,
                responses = $15,
                focus_areas = $16,
                life_phase = $17,
                personality_style = $18,
                membership_level = $19,
                language = $20,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            userId,
            full_name,
            gender,
            birth_date,
            birth_time || null,
            birth_place_city,
            birth_place_country,
            coordinates.latitude,
            coordinates.longitude,
            coordinates.timezone,
            birthChart.data.sunSign,
            birthChart.data.moonSign,
            birthChart.data.risingSign,
            JSON.stringify(birthChart.data),
            JSON.stringify(responses),
            focus_areas,
            life_phase,
            personality_style,
            membership_level,
            language || 'en'
        ]);
        
        await client.query('COMMIT');
        
        return {
            success: true,
            data: result.rows[0]
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create/update profile error:', error);
        return {
            success: false,
            message: error.message
        };
    } finally {
        client.release();
    }
};

// Определить стиль личности на основе ответов
const determinePersonalityStyle = (responses) => {
    if (!responses || !responses.life_approach) {
        return 'balanced';
    }
    
    const approach = responses.life_approach;
    
    if (approach.includes('Optimistic') || approach.includes('adventurous')) {
        return 'optimistic';
    }
    if (approach.includes('Practical') || approach.includes('grounded')) {
        return 'practical';
    }
    if (approach.includes('Thoughtful') || approach.includes('cautious')) {
        return 'thoughtful';
    }
    
    return 'spiritual';
};

// Получить профиль пользователя
const getUserProfile = async (userId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM vector_profiles WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'Profile not found'
            };
        }
        
        return {
            success: true,
            data: result.rows[0]
        };
    } catch (error) {
        console.error('Get profile error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Обновить язык
const updateLanguage = async (userId, language) => {
    try {
        await pool.query(
            'UPDATE vector_profiles SET language = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [language, userId]
        );
        
        return {
            success: true,
            message: 'Language updated'
        };
    } catch (error) {
        console.error('Update language error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// Проверить имеет ли пользователь доступ
const checkAccess = async (userId) => {
    try {
        // Проверяем членство в Club Avalanche
        const result = await pool.query(`
            SELECT program, status FROM gs_memberships 
            WHERE user_id = $1 AND status = 'active'
            ORDER BY purchase_date DESC LIMIT 1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return {
                success: true,
                hasAccess: false,
                level: null
            };
        }
        
        return {
            success: true,
            hasAccess: true,
            level: result.rows[0].program
        };
    } catch (error) {
        console.error('Check access error:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = {
    createOrUpdateProfile,
    getUserProfile,
    updateLanguage,
    checkAccess,
    getCoordinates
};