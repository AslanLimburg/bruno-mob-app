import React from "react";
import "./Modal.css";

const ReceiveModal = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user?.email || '');
    alert('Email copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Receive Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="receive-content">
          <div className="receive-info">
            <p><strong>To receive BRT or other crypto, share your email address:</strong></p>
          </div>

          <div className="receive-address-box">
            <div className="receive-label">Your Email Address</div>
            <div className="receive-address">{user?.email || 'Loading...'}</div>
            <button className="btn-copy" onClick={handleCopyEmail}>
              📋 Copy Email
            </button>
          </div>

          <div className="receive-warning">
            ⚠️ Share this email with the sender. They will use it to send you crypto within Bruno Token system.
          </div>

          <div className="receive-balances">
            <h3>Your Current Balances:</h3>
            <div className="balance-list">
              {user?.balances && Object.entries(user.balances).map(([crypto, balance]) => (
                <div key={crypto} className="balance-item">
                  <span className="crypto-name">{crypto}</span>
                  <span className="crypto-balance">{balance.toFixed(8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;
