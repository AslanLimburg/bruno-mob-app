import React, { useState } from "react";
import "./Modal.css";

const ReceiveModal = ({ isOpen, onClose, balances, addNotification }) => {
  const [crypto, setCrypto] = useState("BTC");

  if (!isOpen) return null;

  // Симуляция адресов кошельков (в реальности они будут из API)
  const walletAddresses = {
    BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    ETH: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    BRT: "BR7x4K9mP2vN5qL8wX3tY6fZ1sH9jC2aR5"
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
