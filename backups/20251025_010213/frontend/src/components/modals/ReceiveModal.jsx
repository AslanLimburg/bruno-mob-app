// Receive Modal Component
// Path: frontend/src/components/modals/ReceiveModal.jsx

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './Modal.css';

const ReceiveModal = ({ onClose, addNotification }) => {
  const [selectedNetwork, setSelectedNetwork] = useState('metamask');

  // Здесь будут реальные адреса из Web3 контекста
  const addresses = {
    metamask: '0xYourMetaMaskAddress',
    tronlink: 'TYourTronLinkAddress'
  };

  const handleCopy = () => {
    const address = addresses[selectedNetwork];
    navigator.clipboard.writeText(address);
    addNotification('success', 'Address copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Receive Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Network Selection */}
          <div className="network-selector">
            <button 
              className={`network-btn ${selectedNetwork === 'metamask' ? 'active' : ''}`}
              onClick={() => setSelectedNetwork('metamask')}
            >
              <span className="network-icon">🦊</span>
              <span>MetaMask</span>
              <small>BSC / Ethereum</small>
            </button>
            
            <button 
              className={`network-btn ${selectedNetwork === 'tronlink' ? 'active' : ''}`}
              onClick={() => setSelectedNetwork('tronlink')}
            >
              <span className="network-icon">🔴</span>
              <span>TronLink</span>
              <small>Tron Network</small>
            </button>
          </div>

          {/* QR Code */}
          <div className="qr-code-container">
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={addresses[selectedNetwork]}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="qr-code-hint">Scan with your wallet app</p>
          </div>

          {/* Address Display */}
          <div className="address-display">
            <label>Your Address:</label>
            <div className="address-box">
              <span className="address-text">{addresses[selectedNetwork]}</span>
              <button className="btn-copy-small" onClick={handleCopy}>
                📋 Copy
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="warning-box">
            <span className="warning-icon">⚠️</span>
            <p>
              Only send {selectedNetwork === 'metamask' ? 'BSC/ETH tokens' : 'TRC20 tokens'} to this address. 
              Sending other assets may result in permanent loss.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;
