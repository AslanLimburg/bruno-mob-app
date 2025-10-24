// frontend/src/components/super-admin/KYCManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KYCManagement.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const KYCManagement = ({ addNotification }) => {
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/upload/admin/documents/pending`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingDocuments(response.data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      addNotification('error', error.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (documentId) => {
    if (!window.confirm('Approve this document?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/upload/admin/document/${documentId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addNotification('success', 'Document approved!');
      fetchPendingDocuments();
      setSelectedDocument(null);
    } catch (error) {
      addNotification('error', error.response?.data?.error || 'Failed to approve document');
    }
  };

  const handleReject = async (documentId) => {
    if (!rejectionReason.trim()) {
      addNotification('error', 'Please specify rejection reason');
      return;
    }

    if (!window.confirm('Reject this document?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/upload/admin/document/${documentId}/reject`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      addNotification('success', 'Document rejected');
      setRejectionReason('');
      fetchPendingDocuments();
      setSelectedDocument(null);
    } catch (error) {
      addNotification('error', error.response?.data?.error || 'Failed to reject document');
    }
  };

  const getDocumentTypeName = (type) => {
    const names = {
      passport: '🛂 Passport',
      id_card: '🪪 ID Card',
      driver_license: '🚗 Driver License',
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="kyc-loading">
        <div className="spinner"></div>
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="kyc-management">
      <div className="kyc-header">
        <h2>🔐 KYC/AML Verification</h2>
        <div className="pending-counter">
          Pending Review: <strong>{pendingDocuments.length}</strong>
        </div>
      </div>

      {pendingDocuments.length === 0 ? (
        <div className="no-pending">
          <p>✅ No documents pending review</p>
        </div>
      ) : (
        <div className="documents-grid">
          {pendingDocuments.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="doc-header">
                <div className="doc-type">
                  {getDocumentTypeName(doc.document_type)}
                </div>
                <div className="doc-date">
                  {new Date(doc.uploaded_at).toLocaleDateString('en-US')}
                </div>
              </div>

              <div className="doc-user-info">
                <div className="info-row">
                  <span className="label">👤 User:</span>
                  <span className="value">{doc.username || doc.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">📧 Email:</span>
                  <span className="value">{doc.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">🆔 User ID:</span>
                  <span className="value">{doc.user_id}</span>
                </div>
                <div className="info-row">
                  <span className="label">⏰ Uploaded:</span>
                  <span className="value">
                    {new Date(doc.uploaded_at).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="doc-actions">
                <a
                  href={doc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button view-button"
                >
                  👁️ View
                </a>

                <button
                  onClick={() => setSelectedDocument(doc)}
                  className="action-button review-button"
                >
                  ⚖️ Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedDocument && (
        <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedDocument(null)}
            >
              ✕
            </button>

            <h2 className="modal-title">⚖️ Review Document</h2>

            <div className="modal-info">
              <div className="modal-row">
                <strong>Type:</strong>
                <span>{getDocumentTypeName(selectedDocument.document_type)}</span>
              </div>
              <div className="modal-row">
                <strong>User:</strong>
                <span>{selectedDocument.username || selectedDocument.email}</span>
              </div>
              <div className="modal-row">
                <strong>Email:</strong>
                <span>{selectedDocument.email}</span>
              </div>
              <div className="modal-row">
                <strong>User ID:</strong>
                <span>{selectedDocument.user_id}</span>
              </div>
            </div>

            <div className="modal-preview">
              <a
                href={selectedDocument.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="preview-button"
              >
                👁️ Open Document in New Tab
              </a>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => handleApprove(selectedDocument.id)}
                className="modal-button approve-button"
              >
                ✅ Approve
              </button>

              <div className="reject-section">
                <textarea
                  placeholder="Rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="rejection-textarea"
                  rows="3"
                />
                <button
                  onClick={() => handleReject(selectedDocument.id)}
                  disabled={!rejectionReason.trim()}
                  className="modal-button reject-button"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;