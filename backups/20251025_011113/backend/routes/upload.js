// backend/routes/upload.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth'); // ✅ ИСПРАВЛЕНО
const { uploadDocument } = require('../middleware/upload');
const { 
  uploadVerificationDocument, 
  getUserDocuments,
  getPendingDocuments,
  approveDocument,
  rejectDocument,
  getVerificationStatus
} = require('../controllers/documentController');

// ===== VERIFICATION DOCUMENTS (User Routes) =====
router.post('/document', authMiddleware, uploadDocument, uploadVerificationDocument);
router.get('/documents', authMiddleware, getUserDocuments);
router.get('/verification/status', authMiddleware, getVerificationStatus);

// ===== VERIFICATION DOCUMENTS (Admin Routes) =====
router.get('/admin/documents/pending', authMiddleware, getPendingDocuments);
router.put('/admin/document/:documentId/approve', authMiddleware, approveDocument);
router.put('/admin/document/:documentId/reject', authMiddleware, rejectDocument);

module.exports = router;