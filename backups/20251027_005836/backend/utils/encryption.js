const crypto = require('crypto');

// Алгоритм шифрования
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Получить мастер-ключ из переменной окружения
 * ВАЖНО: Этот ключ НИКОГДА не должен быть в git!
 */
const getMasterKey = () => {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY not set in environment');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters');
  }
  return key;
};

/**
 * Шифрование приватного ключа
 * @param {string} privateKey - Приватный ключ для шифрования
 * @returns {string} Зашифрованный ключ в base64
 */
const encryptPrivateKey = (privateKey) => {
  try {
    const masterKey = getMasterKey();
    
    // Генерируем соль
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Создаём ключ из мастер-пароля
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');
    
    // Генерируем IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Шифруем
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final()
    ]);
    
    // Получаем authentication tag
    const tag = cipher.getAuthTag();
    
    // Объединяем salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt private key');
  }
};

/**
 * Расшифровка приватного ключа
 * @param {string} encryptedKey - Зашифрованный ключ в base64
 * @returns {string} Расшифрованный приватный ключ
 */
const decryptPrivateKey = (encryptedKey) => {
  try {
    const masterKey = getMasterKey();
    
    // Декодируем из base64
    const data = Buffer.from(encryptedKey, 'base64');
    
    // Извлекаем компоненты
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, TAG_POSITION);
    const tag = data.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.slice(ENCRYPTED_POSITION);
    
    // Восстанавливаем ключ
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');
    
    // Расшифровываем
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt private key');
  }
};

/**
 * Генерация случайного мастер-ключа (использовать один раз при первой настройке)
 */
const generateMasterKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  generateMasterKey
};