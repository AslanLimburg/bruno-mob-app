import React, { useState } from "react";
import "./Modal.css";

const ReceiveModal = ({ isOpen, onClose, user }) => {
  // ✅ ТОЛЬКО 4 криптовалюты (БЕЗ TronLink и USDT-TRC20)
  const [crypto, setCrypto] = useState("BRT");

  if (!isOpen) return null;

  // Адреса для разных сетей
  const walletAddresses = {
    "BRT": user?.email || "your-email@example.com", // BRT получаем по email
    "USDT-BEP20": user?.walletAddresses?.["USDT-BEP20"] || "Connect MetaMask",
    "USDC-ERC20": user?.walletAddresses?.["USDC-ERC20"] || "Connect MetaMask",
    "BRTC": user?.walletAddresses?.BRTC || "Connect MetaMask"
  };

  const currentAddress = walletAddresses[crypto];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentAddress);
    alert(`${crypto} address copied!`);
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        alert(`MetaMask connected: ${accounts[0]}`);
        // Здесь можно сохранить адрес на backend
      } catch (error) {
        console.error("MetaMask connection error:", error);
        alert("Failed to connect MetaMask");
      }
    } else {
      alert("Please install MetaMask extension");
      window.open("https://metamask.io/download/", "_blank");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Receive Crypto</h2>

        {/* ✅ Выбор криптовалюты (БЕЗ TronLink) */}
        <div className="form-group">
          <label>Select Cryptocurrency:</label>
          <select value={crypto} onChange={(e) => setCrypto(e.target.value)}>
            <option value="BRT">BRT (Bruno System)</option>
            <option value="USDT-BEP20">USDT (BEP-20)</option>
            <option value="USDC-ERC20">USDC (ERC-20)</option>
            <option value="BRTC">BRTC (BEP-20)</option>
          </select>
        </div>

        {/* Информация о сети */}
        <div className="network-info">
          {crypto === "BRT" ? (
            <div className="info-box">
              <p><strong>Network:</strong> Bruno System (off-chain)</p>
              <p><strong>Receive via:</strong> Email</p>
              <p className="highlight">Your email: {currentAddress}</p>
            </div>
          ) : crypto.includes("BEP20") || crypto === "BRTC" ? (
            <div className="info-box">
              <p><strong>Network:</strong> BNB Smart Chain (BEP-20)</p>
              <p><strong>Required:</strong> MetaMask wallet</p>
            </div>
          ) : (
            <div className="info-box">
              <p><strong>Network:</strong> Ethereum (ERC-20)</p>
              <p><strong>Required:</strong> MetaMask wallet</p>
            </div>
          )}
        </div>

        {/* Адрес или Email */}
        <div className="address-container">
          {crypto === "BRT" ? (
            <div className="email-display">
              <strong>Your Email Address:</strong>
              <div className="address-box">{currentAddress}</div>
              <button type="button" onClick={copyToClipboard} className="copy-btn">
                📋 Copy Email
              </button>
            </div>
          ) : currentAddress === "Connect MetaMask" ? (
            <div className="connect-wallet">
              <p>Connect MetaMask to receive {crypto}</p>
              <button type="button" onClick={connectMetaMask} className="connect-btn">
                🦊 Connect MetaMask
              </button>
            </div>
          ) : (
            <div className="wallet-display">
              <strong>Your Wallet Address:</strong>
              <div className="address-box">{currentAddress}</div>
              <button type="button" onClick={copyToClipboard} className="copy-btn">
                📋 Copy Address
              </button>
            </div>
          )}
        </div>

        {/* Предупреждение */}
        <div className="warning-box">
          <strong>⚠️ Important:</strong>
          <ul>
            <li>Only send {crypto} to this address</li>
            <li>Sending other tokens may result in permanent loss</li>
            {crypto !== "BRT" && <li>Ensure you're using the correct network ({crypto.includes("BEP") ? "BNB Chain" : "Ethereum"})</li>}
          </ul>
        </div>

        {/* Кнопка закрытия */}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;