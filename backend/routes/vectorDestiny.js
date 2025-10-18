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
        const pool = require('../config/database');
        
        // Получаем базовые вопросы (для всех)
        const baseQuestions = await pool.query(
            `SELECT * FROM vector_questions 
             WHERE membership_level = 'all' 
             ORDER BY order_index`
        );
        
        // Получаем вопросы для уровня
        let levelQuestions = { rows: [] };
        if (level) {
            levelQuestions = await pool.query(
                `SELECT * FROM vector_questions 
                 WHERE membership_level = $1 
                 ORDER BY order_index`,
                [level]
            );
        }
        
        const allQuestions = [...baseQuestions.rows, ...levelQuestions.rows];
        
        res.json({
            success: true,
            data: allQuestions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;