import React, { useState } from "react";
import "./Modal.css";

const SendModal = ({ isOpen, onClose, balances, addNotification }) => {
  const [crypto, setCrypto] = useState("BTC");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const maxAmount = balances[crypto] || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!address || !amount) {
      addNotification("error", "Please fill all fields");
      return;
    }

    if (parseFloat(amount) <= 0) {
      addNotification("error", "Amount must be greater than 0");
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      addNotification("error", `Insufficient ${crypto} balance`);
      return;
    }

    setLoading(true);
    
    // Симуляция отправки (позже подключим к API)
    setTimeout(() => {
      addNotification("success", `Successfully sent ${amount} ${crypto}`);
      setLoading(false);
      onClose();
      // Сбросить форму
      setAddress("");
      setAmount("");
    }, 2000);
  };

  const handleMaxClick = () => {
    setAmount(maxAmount.toFixed(8));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Select Cryptocurrency</label>
            <select value={crypto} onChange={(e) => setCrypto(e.target.value)}>
              {Object.keys(balances).map((c) => (
                <option key={c} value={c}>
                  {c} (Available: {balances[c].toFixed(8)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Recipient Address</label>
            <input
              type="text"
              placeholder="Enter wallet address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Amount
              <span className="balance-info">
                Available: {maxAmount.toFixed(8)} {crypto}
              </span>
            </label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                step="0.00000001"
                placeholder="0.00000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <button type="button" className="btn-max" onClick={handleMaxClick}>
                MAX
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendModal;
