const pool = require('../config/db');
const { uploadFile, deleteFile } = require('../utils/s3Upload');

/**
 * Загрузить документ для верификации
 */
const uploadVerificationDocument = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { documentType } = req.body; // 'passport', 'id_card', 'driver_license', etc.
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Загружаем документ в S3
    const documentUrl = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      `documents/${userId}`
    );

    // Сохраняем в таблицу verification_documents
    await client.query(`
      INSERT INTO verification_documents 
      (user_id, document_type, document_url, status, uploaded_at)
      VALUES ($1, $2, $3, 'pending', NOW())
    `, [userId, documentType, documentUrl]);

    res.json({
      message: 'Document uploaded successfully',
      documentUrl,
      documentType,
      status: 'pending',
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    client.release();
  }
};

/**
 * Получить список документов пользователя
 */
const getUserDocuments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;

    const result = await client.query(`
      SELECT id, document_type, document_url, status, uploaded_at, reviewed_at
      FROM verification_documents
      WHERE user_id = $1
      ORDER BY uploaded_at DESC
    `, [userId]);

    res.json({ documents: result.rows });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  } finally {
    client.release();
  }
};

module.exports = {
  uploadVerificationDocument,
  getUserDocuments,
};