// src/components/verification/Verification.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Verification.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Verification = () => {
  const [documents, setDocuments] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('passport');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchVerificationStatus();
    fetchDocuments();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/upload/verification/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVerificationStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/upload/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        text: 'Only JPG, PNG or PDF files are allowed', 
        type: 'error' 
      });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ 
        text: 'File size must not exceed 10MB', 
        type: 'error' 
      });
      return;
    }
    
    setSelectedFile(file);
    setMessage({ text: '', type: '' });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ text: 'Please select a file', type: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/upload/document`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessage({ 
        text: 'Document successfully uploaded and submitted for review!', 
        type: 'success' 
      });
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';
      
      // Refresh data
      fetchVerificationStatus();
      fetchDocuments();
      
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.error || 'Failed to upload document', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Under Review', icon: '⏳', class: 'status-pending' },
      approved: { text: 'Approved', icon: '✅', class: 'status-approved' },
      rejected: { text: 'Rejected', icon: '❌', class: 'status-rejected' },
    };
    return badges[status] || badges.pending;
  };

  const getOverallStatusBadge = (status) => {
    const badges = {
      not_started: { text: 'Not Started', icon: '⚪', class: 'overall-not-started' },
      pending: { text: 'Pending Review', icon: '🟡', class: 'overall-pending' },
      verified: { text: 'Verified', icon: '🟢', class: 'overall-verified' },
      rejected: { text: 'Rejected', icon: '🔴', class: 'overall-rejected' },
    };
    return badges[status] || badges.not_started;
  };

  const getDocumentTypeName = (type) => {
    const names = {
      passport: '🛂 Passport',
      id_card: '🪪 ID Card',
      driver_license: '🚗 Driver License',
    };
    return names[type] || type;
  };

  const overallBadge = verificationStatus 
    ? getOverallStatusBadge(verificationStatus.status)
    : null;

  if (loading) {
    return (
      <div className="verification-container">
        <div className="verification-card">
          <div className="loading-spinner">⏳ Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-container">
      <div className="verification-card">
        <h1 className="verification-title">🔐 KYC/AML Verification</h1>
        
        {/* Overall Status */}
        {verificationStatus && (
          <div className={`overall-status ${overallBadge.class}`}>
            <span className="status-icon">{overallBadge.icon}</span>
            <span className="status-text">{overallBadge.text}</span>
          </div>
        )}

        {/* Statistics */}
        {verificationStatus && verificationStatus.stats.total > 0 && (
          <div className="stats-container">
            <div className="stat-item">
              <div className="stat-value">{verificationStatus.stats.approved}</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{verificationStatus.stats.pending}</div>
              <div className="stat-label">Under Review</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{verificationStatus.stats.rejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="upload-section">
          <h2>📤 Upload Document</h2>
          
          <div className="form-group">
            <label>Document Type:</label>
            <select 
              value={documentType} 
              onChange={(e) => setDocumentType(e.target.value)}
              className="select-input"
            >
              <option value="passport">🛂 Passport</option>
              <option value="id_card">🪪 ID Card</option>
              <option value="driver_license">🚗 Driver License</option>
            </select>
          </div>

          <div className="form-group">
            <label>File (JPG, PNG or PDF up to 10MB):</label>
            <input
              id="fileInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleFileChange}
              className="file-input"
            />
            {selectedFile && (
              <div className="file-preview">
                📄 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <button 
            onClick={handleUpload} 
            disabled={uploading || !selectedFile}
            className="upload-button"
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload'}
          </button>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Uploaded Documents List */}
        <div className="documents-section">
          <h2>📋 Uploaded Documents</h2>
          
          {documents.length === 0 ? (
            <div className="no-documents">
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => {
                const badge = getStatusBadge(doc.status);
                return (
                  <div key={doc.id} className="document-card">
                    <div className="document-header">
                      <span className="document-type">
                        {getDocumentTypeName(doc.document_type)}
                      </span>
                      <span className={`status-badge ${badge.class}`}>
                        {badge.icon} {badge.text}
                      </span>
                    </div>
                    
                    <div className="document-info">
                      <div className="info-row">
                        <span className="info-label">Uploaded:</span>
                        <span className="info-value">
                          {new Date(doc.uploaded_at).toLocaleString('en-US')}
                        </span>
                      </div>
                      
                      {doc.reviewed_at && (
                        <div className="info-row">
                          <span className="info-label">Reviewed:</span>
                          <span className="info-value">
                            {new Date(doc.reviewed_at).toLocaleString('en-US')}
                          </span>
                        </div>
                      )}
                      
                      {doc.rejection_reason && (
                        <div className="rejection-reason">
                          <strong>Rejection Reason:</strong>
                          <p>{doc.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                    
                    <a 
                      href={doc.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      👁️ View Document
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="info-section">
          <h3>ℹ️ About Verification</h3>
          <ul>
            <li>Verification is required for withdrawals over $1,000</li>
            <li>All documents are stored in encrypted form</li>
            <li>Review typically takes 1-2 business days</li>
            <li>You can upload multiple documents</li>
            <li>If rejected, you can upload a new document</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Verification;