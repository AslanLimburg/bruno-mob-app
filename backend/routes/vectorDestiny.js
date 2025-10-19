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
    startTrialSubscription,
    subscribe,
    cancelSubscription,
    getSubscriptionStatus,
    getBillingHistory,
    SUBSCRIPTION_PRICES,
    TRIAL_DAYS
} = require('../services/vectorDestiny/subscriptionService');

const {
    generateForecast,
    getUserForecast
} = require('../services/vectorDestiny/forecastService');

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

// Получить информацию о ценах
router.get('/pricing', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                prices: SUBSCRIPTION_PRICES,
                trial_days: TRIAL_DAYS,
                currency: 'BRT'
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

// Начать trial (7 дней бесплатно)
router.post('/subscription/trial', async (req, res) => {
    try {
        const { membership_level } = req.body;
        
        if (!membership_level) {
            return res.status(400).json({
                success: false,
                message: 'Membership level is required'
            });
        }
        
        const result = await startTrialSubscription(req.userId, membership_level);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Подписаться (оплата BRT)
router.post('/subscription/subscribe', async (req, res) => {
    try {
        const { membership_level } = req.body;
        
        if (!membership_level) {
            return res.status(400).json({
                success: false,
                message: 'Membership level is required'
            });
        }
        
        const result = await subscribe(req.userId, membership_level);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Отменить подписку
router.post('/subscription/cancel', async (req, res) => {
    try {
        const result = await cancelSubscription(req.userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получить историю платежей
router.get('/subscription/history', async (req, res) => {
    try {
        const result = await getBillingHistory(req.userId);
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

// Получить вопросы для уровня
router.get('/questions', async (req, res) => {
    try {
        const { level } = req.query;
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
        
        console.log(`📋 Loading questions for ${level}: ${result.rows.length} questions`);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;