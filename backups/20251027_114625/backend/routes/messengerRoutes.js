const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MessengerController = require('../controllers/messengerController');
const { authMiddleware } = require('../middleware/auth');

// Создаем директорию для загрузок если её нет
const uploadDir = path.join(__dirname, '../uploads/messenger');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'msg-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    // Разрешенные типы файлов
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mp3|wav|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, videos, audio, and documents are allowed!'));
    }
  }
});

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

// Добавить в контакты
router.post('/add-contact', MessengerController.addContact);

// Загрузка файлов
router.post('/upload', upload.single('file'), MessengerController.uploadFile);

module.exports = router;