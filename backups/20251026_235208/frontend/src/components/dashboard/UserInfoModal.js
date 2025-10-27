import React from 'react';
import './UserInfoModal.css';

const UserInfoModal = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <div className="user-info-modal-overlay" onClick={onClose}>
      <div className="user-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="user-info-modal-header">
          <h2>User Information</h2>
          <button className="user-info-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="user-info-modal-body">
          <div className="user-info-avatar">
            <div className="user-avatar-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          
          <div className="user-info-details">
            <div className="user-info-item">
              <span className="user-info-label">Name:</span>
              <span className="user-info-value">{user?.name || 'Not specified'}</span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">Email:</span>
              <span className="user-info-value">{user?.email || 'Not specified'}</span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">User ID:</span>
              <span className="user-info-value">{user?.id || 'N/A'}</span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">Role:</span>
              <span className="user-info-value user-role">
                {user?.role === 'moderator' ? '⚖️ Moderator' : 
                 user?.role === 'admin' ? '👑 Admin' : 
                 '👤 User'}
              </span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">Referral Code:</span>
              <span className="user-info-value user-referral-code">
                {user?.referralCode || `BRT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`}
              </span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">Balance:</span>
              <span className="user-info-value user-balance">
                {typeof user?.balances?.BRT === 'number' ? user.balances.BRT.toLocaleString() : '0'} BRT
              </span>
            </div>
            
            <div className="user-info-item">
              <span className="user-info-label">Member Since:</span>
              <span className="user-info-value">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;

