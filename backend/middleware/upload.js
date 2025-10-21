const multer = require('multer');

// Настройка multer для хранения файлов в памяти
const storage = multer.memoryStorage();

// Фильтр для изображений
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF and WebP images are allowed.'), false);
  }
};

// Фильтр для документов
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDF and DOC files are allowed.'), false);
  }
};

// Middleware для аватаров (максимум 5MB)
const uploadAvatar = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

// Middleware для логотипов Challenge (максимум 5MB)
const uploadChallengeLogo = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('logo');

// Middleware для документов верификации (максимум 10MB)
const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single('document');

// Middleware для множественных файлов
const uploadMultipleDocuments = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
}).array('documents', 5); // Максимум 5 файлов

module.exports = {
  uploadAvatar,
  uploadChallengeLogo,
  uploadDocument,
  uploadMultipleDocuments,
};