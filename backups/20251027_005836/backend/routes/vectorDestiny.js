const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Импорт сервисов
const {
    createOrUpdateProfile,
    getUserProfile,
    updateLanguage,
    checkAccess
} = require('../services/vectorDestiny/profileService');

const {
    activateSubscription,
    getSubscriptionStatus,
    updateMembershipLevel,
    deactivateSubscription,
    FORECAST_FREQUENCIES
} = require('../services/vectorDestiny/subscriptionService');

const {
    generateForecast,
    getUserForecast
} = require('../services/vectorDestiny/forecastService');

const {
    translateQuestions
} = require('../services/vectorDestiny/translationService');

// Все routes требуют авторизации
router.use(authMiddleware);

// ==========================================
// ACCESS & INFO
// ==========================================

// Проверить доступ к модулю
router.get('/access', async (req, res) => {
    try {
        const result = await checkAccess(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получить информацию о частоте прогнозов
router.get('/frequencies', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                frequencies: FORECAST_FREQUENCIES,
                description: {
                    'GS-I': 'Monthly forecast (once per month)',
                    'GS-II': 'Bi-weekly forecast (every 2 weeks)',
                    'GS-III': 'Weekly forecast (every week)',
                    'GS-IV': 'Daily forecast (every day)'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получить доступные языки
router.get('/languages', async (req, res) => {
    try {
        const languages = [
            { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
            { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇦🇪' },
            { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
            { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' }
        ];
        
        res.json({ success: true, data: languages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// PROFILE
// ==========================================

// Получить профиль
router.get('/profile', async (req, res) => {
    try {
        const result = await getUserProfile(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Создать или обновить профиль (анкета)
router.post('/profile', async (req, res) => {
    try {
        const result = await createOrUpdateProfile(req.userId, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Обновить язык
router.post('/profile/language', async (req, res) => {
    try {
        const { language } = req.body;
        
        if (!language) {
            return res.status(400).json({
                success: false,
                message: 'Language is required'
            });
        }
        
        const result = await updateLanguage(req.userId, language);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// SUBSCRIPTION
// ==========================================

// Получить статус подписки
router.get('/subscription', async (req, res) => {
    try {
        const result = await getSubscriptionStatus(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Активировать подписку автоматически (при наличии GS программы)
router.post('/subscription/activate', async (req, res) => {
    try {
        const { membership_level } = req.body;
        
        if (!membership_level) {
            return res.status(400).json({
                success: false,
                message: 'Membership level is required'
            });
        }
        
        const result = await activateSubscription(req.userId, membership_level);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Обновить уровень подписки (при изменении GS программы)
router.post('/subscription/update-level', async (req, res) => {
    try {
        const { membership_level } = req.body;
        
        if (!membership_level) {
            return res.status(400).json({
                success: false,
                message: 'Membership level is required'
            });
        }
        
        const result = await updateMembershipLevel(req.userId, membership_level);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Деактивировать подписку (при выходе из GS программы)
router.post('/subscription/deactivate', async (req, res) => {
    try {
        const result = await deactivateSubscription(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// FORECAST
// ==========================================

// Генерировать прогноз
router.post('/forecast/generate', async (req, res) => {
    try {
        const result = await generateForecast(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получить прогноз (последний или по ID)
router.get('/forecast/:id?', async (req, res) => {
    try {
        const forecastId = req.params.id ? parseInt(req.params.id) : null;
        const result = await getUserForecast(req.userId, forecastId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// QUESTIONS (для анкеты)
// ==========================================

// Получить вопросы для уровня (с переводом)
router.get('/questions', async (req, res) => {
    try {
        const { level, language } = req.query;
        const { pool } = require('../config/database');
        
        if (!level) {
            return res.status(400).json({
                success: false,
                message: 'Level is required'
            });
        }
        
        // Определяем иерархию уровней
        const levelHierarchy = {
            'GS-I': ['all', 'GS-I'],
            'GS-II': ['all', 'GS-I', 'GS-II'],
            'GS-III': ['all', 'GS-I', 'GS-II', 'GS-III'],
            'GS-IV': ['all', 'GS-I', 'GS-II', 'GS-III', 'GS-IV']
        };
        
        const levelsToLoad = levelHierarchy[level] || ['all', 'GS-I'];
        
        // Загружаем вопросы для всех уровней до текущего
        const result = await pool.query(
            `SELECT * FROM vector_questions 
             WHERE membership_level = ANY($1)
             ORDER BY 
                CASE membership_level 
                    WHEN 'all' THEN 0
                    WHEN 'GS-I' THEN 1
                    WHEN 'GS-II' THEN 2
                    WHEN 'GS-III' THEN 3
                    WHEN 'GS-IV' THEN 4
                END,
                order_index, 
                id`,
            [levelsToLoad]
        );
        
        let questions = result.rows;
        
        console.log(`📋 Loading questions for ${level}: ${questions.length} questions`);
        
        // Переводим вопросы если указан язык и это не английский
        if (language && language !== 'en') {
            console.log(`🌍 Translating ${questions.length} questions to ${language}...`);
            questions = await translateQuestions(questions, language);
            console.log(`✅ Translation complete`);
        }
        
        res.json({
            success: true,
            data: questions,
            language: language || 'en'
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;