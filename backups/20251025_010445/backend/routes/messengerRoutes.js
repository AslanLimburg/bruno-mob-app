const express = require('express');
const router = express.Router();
const MessengerController = require('../controllers/messengerController');
const { authMiddleware } = require('../middleware/auth');

// Все роуты требуют авторизации
router.use(authMiddleware);

// Отправка сообщения
router.post('/send', MessengerController.sendMessage);

// Получить переписку с пользователем
router.get('/conversation/:userId', MessengerController.getConversation);

// Получить список контактов
router.get('/contacts', MessengerController.getContacts);

// Отметить как прочитанное
router.put('/read/:userId', MessengerController.markAsRead);

// Поиск пользователей
router.get('/search', MessengerController.searchUsers);

module.exports = router;