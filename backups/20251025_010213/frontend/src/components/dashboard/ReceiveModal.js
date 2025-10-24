import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./Modal.css";

const ReceiveModal = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState("offchain"); // "offchain" или "onchain"

  if (!isOpen) return null;

  // Адреса кошельков (пока mock, потом подключим из user)
  const metamaskAddress = user?.metamaskAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  const tronlinkAddress = user?.tronlinkAddress || "TXYZopYRdj2D9XRtbG4uXGobSJpT2fU4Gh";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user?.email || '');
    alert('Email copied to clipboard!');
  };

  const handleCopyAddress = (address, type) => {
    navigator.clipboard.writeText(address);
    alert(`${type} address copied to clipboard!`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Receive Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Табы */}
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeTab === "offchain" ? "active" : ""}`}
            onClick={() => setActiveTab("offchain")}
          >
            Off-Chain (Email)
          </button>
          <button 
            className={`tab-button ${activeTab === "onchain" ? "active" : ""}`}
            onClick={() => setActiveTab("onchain")}
          >
            On-Chain (Crypto)
          </button>
        </div>

        <div className="receive-content">
          
          {/* OFF-CHAIN: Email для получения BRT */}
          {activeTab === "offchain" && (
            <>
              <div className="receive-info">
                <p><strong>To receive BRT, share your email address:</strong></p>
              </div>

              <div className="receive-address-box">
                <div className="receive-label">Your Email Address</div>
                <div className="receive-address">{user?.email || 'Loading...'}</div>
                <button className="btn-copy" onClick={handleCopyEmail}>
                  📋 Copy Email
                </button>
              </div>

              <div className="receive-warning">
                ⚠️ Share this email with the sender. They will use it to send you BRT within Bruno Token system.
              </div>
            </>
          )}

          {/* ON-CHAIN: Wallet адреса с QR кодами */}
          {activeTab === "onchain" && (
            <>
              <div className="receive-info">
                <p><strong>Scan QR code or copy address to receive crypto:</strong></p>
              </div>

              {/* MetaMask (EVM) */}
              <div className="wallet-section">
                <h3 className="wallet-title">🦊 MetaMask (Ethereum/BSC)</h3>
                <div className="wallet-content">
                  <div className="qr-code-container">
                    <QRCodeSVG 
                      value={metamaskAddress} 
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="wallet-address-box">
                    <div className="receive-label">Your MetaMask Address</div>
                    <div className="receive-address small">{metamaskAddress}</div>
                    <button 
                      className="btn-copy" 
                      onClick={() => handleCopyAddress(metamaskAddress, "MetaMask")}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                </div>
                <div className="wallet-hint">
                  <small>✅ For: USDT (BEP-20), USDC (ERC-20), BRTC (BEP-20)</small>
                </div>
              </div>

              {/* TronLink */}
              <div className="wallet-section">
                <h3 className="wallet-title">🔺 TronLink (Tron)</h3>
                <div className="wallet-content">
                  <div className="qr-code-container">
                    <QRCodeSVG 
                      value={tronlinkAddress} 
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="wallet-address-box">
                    <div className="receive-label">Your TronLink Address</div>
                    <div className="receive-address small">{tronlinkAddress}</div>
                    <button 
                      className="btn-copy" 
                      onClick={() => handleCopyAddress(tronlinkAddress, "TronLink")}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                </div>
                <div className="wallet-hint">
                  <small>✅ For: USDT (TRC-20), TRX</small>
                </div>
              </div>

              <div className="receive-warning">
                ⚠️ <strong>Important:</strong> Make sure to send crypto on the correct network! 
                Wrong network = lost funds.
              </div>
            </>
          )}

          {/* Балансы (показываем всегда) */}
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
