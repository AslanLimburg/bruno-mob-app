// backend/controllers/documentController.js
const { pool } = require('../config/database');
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
      SELECT id, document_type, document_url, status, uploaded_at, reviewed_at, rejection_reason
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

// ========== НОВЫЕ ФУНКЦИИ ДЛЯ KYC (НЕ УДАЛЯЕМ СТАРЫЕ!) ==========

/**
 * Получить все документы на проверку (для админов)
 */
const getPendingDocuments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Проверка прав админа
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await client.query(`
      SELECT vd.*, u.email, u.name as username 
      FROM verification_documents vd
      JOIN users u ON vd.user_id = u.id
      WHERE vd.status = 'pending'
      ORDER BY vd.uploaded_at ASC
    `);
    
    res.json({ documents: result.rows });
    
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.status(500).json({ error: 'Failed to get pending documents' });
  } finally {
    client.release();
  }
};

/**
 * Одобрить документ
 */
const approveDocument = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Проверка прав админа
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { documentId } = req.params;
    const reviewerId = req.user.id;
    
    const result = await client.query(`
      UPDATE verification_documents 
      SET status = 'approved', 
          reviewed_at = NOW(), 
          reviewed_by = $1
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [reviewerId, documentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or already reviewed' });
    }
    
    res.json({
      message: 'Document approved',
      document: result.rows[0]
    });
    
  } catch (error) {
    console.error('Approve document error:', error);
    res.status(500).json({ error: 'Failed to approve document' });
  } finally {
    client.release();
  }
};

/**
 * Отклонить документ
 */
const rejectDocument = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Проверка прав админа
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { documentId } = req.params;
    const { reason } = req.body;
    const reviewerId = req.user.id;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const result = await client.query(`
      UPDATE verification_documents 
      SET status = 'rejected', 
          reviewed_at = NOW(), 
          reviewed_by = $1,
          rejection_reason = $2
      WHERE id = $3 AND status = 'pending'
      RETURNING *
    `, [reviewerId, reason, documentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or already reviewed' });
    }
    
    res.json({
      message: 'Document rejected',
      document: result.rows[0]
    });
    
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  } finally {
    client.release();
  }
};

/**
 * Получить статус верификации пользователя
 */
const getVerificationStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM verification_documents 
      WHERE user_id = $1
    `, [userId]);
    
    const stats = result.rows[0];
    
    // Определение общего статуса
    let overallStatus = 'not_started';
    if (stats.total_documents > 0) {
      if (stats.approved > 0) {
        overallStatus = 'verified';
      } else if (stats.pending > 0) {
        overallStatus = 'pending';
      } else if (stats.rejected > 0) {
        overallStatus = 'rejected';
      }
    }
    
    res.json({
      status: overallStatus,
      stats: {
        total: parseInt(stats.total_documents),
        approved: parseInt(stats.approved),
        pending: parseInt(stats.pending),
        rejected: parseInt(stats.rejected)
      }
    });
    
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  } finally {
    client.release();
  }
};

// ========== ЭКСПОРТ (ДОБАВЛЯЕМ НОВЫЕ ФУНКЦИИ) ==========
module.exports = {
  uploadVerificationDocument,
  getUserDocuments,
  // Новые функции для KYC:
  getPendingDocuments,
  approveDocument,
  rejectDocument,
  getVerificationStatus
};
