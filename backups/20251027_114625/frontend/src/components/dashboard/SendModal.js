import React, { useState } from "react";
import TokenIcon from "../TokenIcon";
import "./Modal.css";

const SendModal = ({ isOpen, onClose, balances, addNotification, refreshUser }) => {
  // ✅ ТОЛЬКО 4 криптовалюты (БЕЗ USDT-TRC20)
  const [crypto, setCrypto] = useState("BRT");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Определяем режим: off-chain (BRT) или on-chain (crypto)
  const isOffChain = crypto === "BRT";
  const onChainTokens = ["USDT-BEP20", "USDC-ERC20", "BRTC"];

  if (!isOpen) return null;

  const maxAmount = balances[crypto] || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Off-chain (BRT) - отправка по email
    if (isOffChain) {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(`${process.env.REACT_APP_API_URL}/wallet/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            crypto: "BRT",
            amount: parseFloat(amount),
            toEmail: recipient
          })
        });

        const data = await response.json();

        if (data.success) {
          addNotification("success", `Successfully sent ${amount} BRT to ${recipient}`);
          await refreshUser();
          onClose();
          setRecipient("");
          setAmount("");
        } else {
          addNotification("error", data.message || "Failed to send BRT");
        }
      } catch (error) {
        console.error("Send error:", error);
        addNotification("error", "An error occurred while sending");
      } finally {
        setLoading(false);
      }
    } 
    // On-chain (USDT-BEP20, USDC-ERC20, BRTC) - отправка на адрес кошелька
    else {
      try {
        setLoading(true);

        // Валидация баланса
        if (parseFloat(amount) > maxAmount) {
          addNotification("error", `Insufficient ${crypto} balance`);
          return;
        }

        // Валидация адреса
        const isBEP20 = crypto.includes("BEP20") || crypto === "BRTC";
        const isERC20 = crypto.includes("ERC20");
        
        if (isBEP20 && !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
          addNotification("error", "Invalid BEP-20 wallet address");
          return;
        }
        
        if (isERC20 && !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
          addNotification("error", "Invalid ERC-20 wallet address");
          return;
        }

        const token = localStorage.getItem("token");
        const response = await fetch(`${process.env.REACT_APP_API_URL}/wallet/send-crypto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            crypto,
            amount: parseFloat(amount),
            toAddress: recipient
          })
        });

        const data = await response.json();

        if (data.success) {
          addNotification("success", `Successfully sent ${amount} ${crypto}`);
          await refreshUser();
          onClose();
          setRecipient("");
          setAmount("");
        } else {
          addNotification("error", data.message || "Failed to send crypto");
        }
      } catch (error) {
        console.error("Send crypto error:", error);
        addNotification("error", "An error occurred while sending");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Send Crypto</h2>
        <form onSubmit={handleSubmit}>
          {/* ✅ Выбор криптовалюты (БЕЗ USDT-TRC20) */}
          <div className="form-group">
            <label>Select Cryptocurrency:</label>
            <div className="token-select-wrapper">
              <TokenIcon symbol={crypto} size={32} className="token-select-icon" />
              <select value={crypto} onChange={(e) => setCrypto(e.target.value)}>
                <option value="BRT">BRT (Bruno System)</option>
                <option value="USDT-BEP20">USDT (BEP-20)</option>
                <option value="USDC-ERC20">USDC (ERC-20)</option>
                <option value="BRTC">BRTC (BEP-20)</option>
              </select>
            </div>
          </div>

          {/* Получатель */}
          <div className="form-group">
            <label>{isOffChain ? "Recipient Email:" : "Wallet Address:"}</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={isOffChain ? "email@example.com" : "0x..."}
              required
            />
          </div>

          {/* Сумма */}
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
            <small>Available: {maxAmount.toFixed(5)} {crypto}</small>
          </div>

          {/* Кнопки */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendModal;