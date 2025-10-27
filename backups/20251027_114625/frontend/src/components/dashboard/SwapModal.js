import React, { useState } from "react";
import TokenIcon from "../TokenIcon";
import "./Modal.css";

const SwapModal = ({ isOpen, onClose, balances, addNotification, refreshUser }) => {
  // ✅ ТОЛЬКО 4 криптовалюты (БЕЗ USDT-TRC20)
  const [fromCrypto, setFromCrypto] = useState("BRT");
  const [toCrypto, setToCrypto] = useState("USDT-BEP20");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Список криптовалют для swap
  const cryptoOptions = [
    { value: "BRT", label: "BRT (Bruno System)" },
    { value: "USDT-BEP20", label: "USDT (BEP-20)" },
    { value: "USDC-ERC20", label: "USDC (ERC-20)" },
    { value: "BRTC", label: "BRTC (BEP-20)" }
  ];

  // Расчет курса (1:1 для всех)
  const exchangeRate = 1;
  const estimatedReceive = parseFloat(amount || 0) * exchangeRate;

  const maxAmount = balances[fromCrypto] || 0;

  const handleSwap = async (e) => {
    e.preventDefault();

    if (fromCrypto === toCrypto) {
      addNotification("error", "Cannot swap same cryptocurrency");
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      addNotification("error", `Insufficient ${fromCrypto} balance`);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/wallet/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          fromCrypto,
          toCrypto,
          amount: parseFloat(amount)
        })
      });

      const data = await response.json();

      if (data.success) {
        addNotification("success", `Successfully swapped ${amount} ${fromCrypto} to ${toCrypto}`);
        await refreshUser();
        onClose();
        setAmount("");
      } else {
        addNotification("error", data.message || "Swap failed");
      }
    } catch (error) {
      console.error("Swap error:", error);
      addNotification("error", "An error occurred during swap");
    } finally {
      setLoading(false);
    }
  };

  const switchCryptos = () => {
    setFromCrypto(toCrypto);
    setToCrypto(fromCrypto);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Swap Crypto</h2>
        <form onSubmit={handleSwap}>
          {/* From */}
          <div className="form-group">
            <label>From:</label>
            <div className="token-select-wrapper">
              <TokenIcon symbol={fromCrypto} size={32} className="token-select-icon" />
              <select 
                value={fromCrypto} 
                onChange={(e) => setFromCrypto(e.target.value)}
              >
                {cryptoOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <small>Available: {maxAmount.toFixed(5)} {fromCrypto}</small>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label>Amount:</label>
            <input
              type="number"
              step="0.00001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Switch Button */}
          <div className="swap-switch">
            <button type="button" onClick={switchCryptos} className="switch-btn">
              🔄 Switch
            </button>
          </div>

          {/* To */}
          <div className="form-group">
            <label>To:</label>
            <div className="token-select-wrapper">
              <TokenIcon symbol={toCrypto} size={32} className="token-select-icon" />
              <select 
                value={toCrypto} 
                onChange={(e) => setToCrypto(e.target.value)}
              >
                {cryptoOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Receive */}
          <div className="estimate-box">
            <p>You will receive:</p>
            <strong>{estimatedReceive.toFixed(5)} {toCrypto}</strong>
            <small>Exchange rate: 1 {fromCrypto} = {exchangeRate} {toCrypto}</small>
          </div>

          {/* Exchange Info */}
          <div className="info-box">
            <p><strong>💡 Note:</strong> All cryptocurrencies are exchanged at 1:1 rate</p>
            <p><strong>Calculation:</strong> 1 BRT = 1 USD</p>
          </div>

          {/* Кнопки */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Swapping..." : "Swap"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SwapModal;