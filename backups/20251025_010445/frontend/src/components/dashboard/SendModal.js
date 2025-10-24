import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Modal.css";

const SendModal = ({ isOpen, onClose, balances, addNotification, onTransactionComplete }) => {
  const [crypto, setCrypto] = useState("BRT");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Определяем режим: off-chain (BRT) или on-chain (crypto)
  const isOffChain = crypto === "BRT";
  const onChainTokens = ["USDT-BEP20", "USDC-ERC20", "USDT-TRC20", "TRX", "BRTC"];

  if (!isOpen) return null;

  const maxAmount = balances[crypto] || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Off-chain (BRT) - отправка по email
    if (isOffChain) {
      if (!recipientEmail || !amount) {
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
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/wallet/send`,
          {
            recipientEmail,
            crypto,
            amount: parseFloat(amount)
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.success) {
          addNotification("success", `${response.data.message} (Service fee: 0.02 BRT)`);
          
          setRecipientEmail("");
          setAmount("");
          
          if (onTransactionComplete) {
            await onTransactionComplete();
          }
          
          onClose();
        }
      } catch (error) {
        addNotification("error", error.response?.data?.message || "Failed to send");
      } finally {
        setLoading(false);
      }
    } 
    // On-chain (Crypto) - отправка по адресу кошелька
    else {
      if (!recipientAddress || !amount) {
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

      // Валидация адреса
      const isTron = crypto.includes("TRC20") || crypto === "TRX";
      if (isTron && !recipientAddress.startsWith("T")) {
        addNotification("error", "Invalid Tron address (must start with T)");
        return;
      }
      if (!isTron && !recipientAddress.startsWith("0x")) {
        addNotification("error", "Invalid Ethereum address (must start with 0x)");
        return;
      }

      setLoading(true);

      try {
        if (isTron) {
          await sendViaTronLink();
        } else {
          await sendViaMetaMask();
        }
      } catch (error) {
        console.error("Send error:", error);
        addNotification("error", error.message || "Transaction failed");
        setLoading(false);
      }
    }
  };

  // Отправка через MetaMask
  const sendViaMetaMask = async () => {
    if (!window.ethereum) {
      addNotification("error", "Please install MetaMask wallet");
      setLoading(false);
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const fromAddress = accounts[0];
      const amountWei = `0x${(parseFloat(amount) * 1e18).toString(16)}`;

      const txParams = {
        from: fromAddress,
        to: recipientAddress,
        value: amountWei,
        gas: '0x5208',
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      addNotification("success", `Transaction sent! Hash: ${txHash.substring(0, 10)}...`);

      // Сохранить в БД
      await saveTransaction(txHash, "ethereum");

      setRecipientAddress("");
      setAmount("");

      if (onTransactionComplete) {
        await onTransactionComplete();
      }

      setTimeout(() => onClose(), 2000);

    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Отправка через TronLink
  const sendViaTronLink = async () => {
    if (!window.tronWeb || !window.tronWeb.ready) {
      addNotification("error", "Please install TronLink wallet");
      setLoading(false);
      return;
    }

    try {
      const amountSun = window.tronWeb.toSun(amount);

      const transaction = await window.tronWeb.trx.sendTransaction(
        recipientAddress,
        amountSun
      );

      if (transaction.result) {
        addNotification("success", `Transaction sent! Hash: ${transaction.txid.substring(0, 10)}...`);

        // Сохранить в БД
        await saveTransaction(transaction.txid, "tron");

        setRecipientAddress("");
        setAmount("");

        if (onTransactionComplete) {
          await onTransactionComplete();
        }

        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Сохранить транзакцию в БД
  const saveTransaction = async (hash, chain) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/transactions/crypto`,
        {
          type: "send",
          token: crypto,
          amount: parseFloat(amount),
          recipientAddress,
          txHash: hash,
          chain,
          status: "pending"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error("Failed to save transaction:", error);
    }
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
              <option value="BRT">BRT (Available: {(balances.BRT || 0).toFixed(8)})</option>
              {onChainTokens.map((c) => (
                <option key={c} value={c}>
                  {c} (Available: {(balances[c] || 0).toFixed(8)})
                </option>
              ))}
            </select>
          </div>

          {isOffChain ? (
            <div className="form-group">
              <label>Recipient Email</label>
              <input
                type="email"
                placeholder="Enter recipient's email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Recipient Wallet Address</label>
              <input
                type="text"
                placeholder={crypto.includes("TRC20") || crypto === "TRX" ? "T..." : "0x..."}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                required
              />
            </div>
          )}

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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
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