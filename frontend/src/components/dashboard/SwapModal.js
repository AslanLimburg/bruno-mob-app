import React, { useState } from "react";
import "./Modal.css";

const SwapModal = ({ isOpen, onClose, balances, addNotification }) => {
  const cryptos = Object.keys(balances);
  const [fromCrypto, setFromCrypto] = useState(cryptos[0] || "BTC");
  const [toCrypto, setToCrypto] = useState(cryptos[1] || "ETH");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Симуляция курсов обмена
  const exchangeRates = {
    BTC: { ETH: 15.5, BRT: 25000 },
    ETH: { BTC: 0.065, BRT: 1612 },
    BRT: { BTC: 0.00004, ETH: 0.00062 }
  };

  const maxAmount = balances[fromCrypto] || 0;
  
  const getExchangeRate = () => {
    if (fromCrypto === toCrypto) return 1;
    return exchangeRates[fromCrypto]?.[toCrypto] || 0;
  };

  const calculateReceiveAmount = () => {
    if (!amount || amount <= 0) return "0.00000000";
    const rate = getExchangeRate();
    return (parseFloat(amount) * rate).toFixed(8);
  };

  const handleSwitch = () => {
    setFromCrypto(toCrypto);
    setToCrypto(fromCrypto);
  };

  const handleMaxClick = () => {
    setAmount(maxAmount.toFixed(8));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      addNotification("error", "Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      addNotification("error", `Insufficient ${fromCrypto} balance`);
      return;
    }

    if (fromCrypto === toCrypto) {
      addNotification("error", "Cannot swap same cryptocurrency");
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      const receiveAmount = calculateReceiveAmount();
      addNotification("success", `Swapped ${amount} ${fromCrypto} to ${receiveAmount} ${toCrypto}`);
      setLoading(false);
      onClose();
      setAmount("");
    }, 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content swap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Swap Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              From
              <span className="balance-info">
                Available: {maxAmount.toFixed(8)} {fromCrypto}
              </span>
            </label>
            <div className="swap-input-group">
              <input
                type="number"
                step="0.00000001"
                placeholder="0.00000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <select value={fromCrypto} onChange={(e) => setFromCrypto(e.target.value)}>
                {cryptos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="button" className="btn-max-inline" onClick={handleMaxClick}>
                MAX
              </button>
            </div>
          </div>

          <div className="swap-switch-container">
            <button type="button" className="btn-switch" onClick={handleSwitch}>
              ⇅
            </button>
          </div>

          <div className="form-group">
            <label>To (estimated)</label>
            <div className="swap-input-group">
              <input
                type="text"
                value={calculateReceiveAmount()}
                readOnly
                className="readonly-input"
              />
              <select value={toCrypto} onChange={(e) => setToCrypto(e.target.value)}>
                {cryptos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="exchange-rate-info">
            <p>Exchange Rate</p>
            <p className="rate-value">
              1 {fromCrypto} = {getExchangeRate().toFixed(8)} {toCrypto}
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Swapping..." : "Swap"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SwapModal;
