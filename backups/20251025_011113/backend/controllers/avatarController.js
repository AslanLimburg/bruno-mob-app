const pool = require('../config/db');
const { uploadFile, deleteFile } = require('../utils/s3Upload');

/**
 * Загрузить аватар пользователя
 */
const uploadUserAvatar = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Получаем текущий аватар пользователя
    const userResult = await client.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const oldAvatarUrl = userResult.rows[0]?.avatar_url;

    // Загружаем новый аватар в S3
    const avatarUrl = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      'avatars'
    );

    // Обновляем URL аватара в базе данных
    await client.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );

    // Удаляем старый аватар из S3 (если был)
    if (oldAvatarUrl && oldAvatarUrl.includes('s3.twcstorage.ru')) {
      try {
        await deleteFile(oldAvatarUrl);
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
        // Не прерываем выполнение, если не удалось удалить старый файл
      }
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  } finally {
    client.release();
  }
};

/**
 * Удалить аватар пользователя
 */
const deleteUserAvatar = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;

    // Получаем URL аватара
    const result = await client.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const avatarUrl = result.rows[0]?.avatar_url;

    if (!avatarUrl) {
      return res.status(404).json({ error: 'No avatar to delete' });
    }

    // Удаляем из S3
    if (avatarUrl.includes('s3.twcstorage.ru')) {
      await deleteFile(avatarUrl);
    }

    // Обновляем базу данных
    await client.query(
      'UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Avatar deleted successfully' });

  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  } finally {
    client.release();
  }
};

module.exports = {
  uploadUserAvatar,
  deleteUserAvatar,
};