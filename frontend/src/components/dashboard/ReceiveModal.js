import React, { useState } from "react";
import "./Modal.css";

const ReceiveModal = ({ isOpen, onClose, balances, addNotification, user }) => {
  const [crypto, setCrypto] = useState("BTC");

  if (!isOpen) return null;

  // Генерация уникального адреса для каждого пользователя
  const generateUserAddress = (userId, email, cryptoType) => {
    // Простая генерация на основе user ID и email
    const base = `${userId}-${email}`;
    const hash = Array.from(base).reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    
    const uniqueId = Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
    
    switch(cryptoType) {
      case 'BTC':
        return `1${uniqueId}${userId}BTC${Math.abs(hash % 100000)}`;
      case 'ETH':
        return `0x${uniqueId}${userId.toString().padStart(4, '0')}ETH${Math.abs(hash % 1000000).toString(16)}`;
      case 'BRT':
        return `BRT${uniqueId}${userId}${email.substring(0, 3).toUpperCase()}${Math.abs(hash % 100000)}`;
      default:
        return `${cryptoType}${uniqueId}${userId}`;
    }
  };

  const walletAddresses = {
    BTC: generateUserAddress(user.id, user.email, 'BTC'),
    ETH: generateUserAddress(user.id, user.email, 'ETH'),
    BRT: generateUserAddress(user.id, user.email, 'BRT')
  };

  const currentAddress = walletAddresses[crypto] || "";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(currentAddress);
    addNotification("success", "Address copied to clipboard!");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content receive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Receive Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label>Select Cryptocurrency</label>
            <select value={crypto} onChange={(e) => setCrypto(e.target.value)}>
              {Object.keys(balances).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="receive-info">
            <p className="receive-label">Your {crypto} Address</p>
            <div className="address-display">
              <code>{currentAddress}</code>
            </div>
            <button className="btn-copy" onClick={handleCopyAddress}>
              📋 Copy Address
            </button>
          </div>

          <div className="receive-warning">
            <p>⚠️ Only send {crypto} to this address</p>
            <p className="warning-text">Sending other cryptocurrencies may result in permanent loss</p>
          </div>

          <div className="modal-actions">
            <button className="btn-primary full-width" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;