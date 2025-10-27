import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './DeleteAccount.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DeleteAccount = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDeleteRequest = () => {
    setShowConfirm(true);
    setError('');
  };

  const handleDeleteConfirm = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`${API_URL}/auth/delete-account`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Your account has been permanently deleted.');
      logout();
      navigate('/');
    } catch (err) {
      console.error('Delete account error:', err);
      setError(err.response?.data?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setConfirmText('');
    setError('');
  };

  return (
    <div className="delete-account-container">
      <div className="delete-account-card">
        <div className="danger-zone-header">
          <span className="danger-icon">⚠️</span>
          <h2>Danger Zone</h2>
        </div>

        <div className="delete-info">
          <h3>Delete Account</h3>
          <p className="delete-warning">
            This action is <strong>permanent and irreversible</strong>. All your data will be permanently deleted:
          </p>
          <ul className="delete-list">
            <li>✗ Your profile and account information</li>
            <li>✗ All messages and contacts</li>
            <li>✗ Challenge and lottery history</li>
            <li>✗ Vector Destiny profiles and forecasts</li>
            <li>✗ All associated data</li>
          </ul>
        </div>

        {!showConfirm ? (
          <button 
            className="btn-delete-account" 
            onClick={handleDeleteRequest}
          >
            🗑️ Delete My Account
          </button>
        ) : (
          <div className="delete-confirm-box">
            <p className="confirm-text">
              To confirm deletion, type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              className="confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            <div className="confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handleDeleteConfirm}
                disabled={loading || confirmText.toLowerCase() !== 'delete'}
              >
                {loading ? 'Deleting...' : '🗑️ Permanently Delete Account'}
              </button>
            </div>
          </div>
        )}

        <div className="user-info-display">
          <p><strong>Current Account:</strong> {user?.email}</p>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;

