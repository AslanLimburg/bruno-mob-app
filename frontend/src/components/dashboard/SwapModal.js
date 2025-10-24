import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Modal.css";

const SwapModal = ({ isOpen, onClose, balances, addNotification, onTransactionComplete }) => {
  const cryptos = ["BRT", "USDT-BEP20", "USDC-ERC20", "USDT-TRC20", "BRTC"];
  const [fromCrypto, setFromCrypto] = useState("USDT-BEP20");
  const [toCrypto, setToCrypto] = useState("BRT");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState({});

  // 🆕 ФУНКЦИЯ МАППИНГА БАЛАНСОВ (БД → SwapModal формат)
  const mapBalances = (dbBalances) => {
    if (!dbBalances) return {};
    
    return {
      'BRT': dbBalances.BRT || 0,
      'BRTC': dbBalances.BRTC || 0,
      'USDT-BEP20': dbBalances.USDT || 0,      // USDT из БД → USDT-BEP20
      'USDC-ERC20': dbBalances.USDC || 0,      // USDC из БД → USDC-ERC20
      'USDT-TRC20': dbBalances.USDT || 0,      // Тот же USDT для TRC20
      'ETH': dbBalances.ETH || 0,
      'BTC': dbBalances.BTC || 0
    };
  };

  // 🆕 ФУНКЦИЯ ОБРАТНОГО МАППИНГА (SwapModal → БД формат для backend)
  const mapTokenToBackend = (swapToken) => {
    const mapping = {
      'USDT-BEP20': 'USDT',
      'USDT-TRC20': 'USDT',
      'USDC-ERC20': 'USDC'
    };
    return mapping[swapToken] || swapToken; // Если нет в маппинге, возвращаем как есть
  };

  // 🆕 Используем маппированные балансы
  const mappedBalances = mapBalances(balances);

  useEffect(() => {
    if (isOpen) {
      fetchRates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxAmount = mappedBalances[fromCrypto] || 0;

  // Получить курсы обмена
  const fetchRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/swap/rates`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRates(response.data.rates || {});
    } catch (error) {
      console.error("Failed to fetch rates:", error);
      // Fallback курсы
      setRates({
        "BRT": 1,
        "USDT-BEP20": 1,
        "USDC-ERC20": 1,
        "USDT-TRC20": 1,
        "BRTC": 0.01
      });
    }
  };

  // Рассчитать сумму получения
  const calculateReceiveAmount = () => {
    if (!amount || parseFloat(amount) <= 0) return "0.00000000";

    const fromRate = rates[fromCrypto] || 1;
    const toRate = rates[toCrypto] || 1;
    
    // Конвертация: amount * (fromRate / toRate) * (1 - fee)
    const fee = 0.005; // 0.5%
    const result = parseFloat(amount) * (fromRate / toRate) * (1 - fee);
    
    return result.toFixed(8);
  };

  // Переключить валюты местами
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

    try {
      // Определяем тип swap
      const fromIsBRT = fromCrypto === "BRT";
      const toIsBRT = toCrypto === "BRT";
      const fromIsCrypto = !fromIsBRT;
      const toIsCrypto = !toIsBRT;

      // 1. CRYPTO → BRT (через BRTC)
      if (fromIsCrypto && toIsBRT) {
        await swapCryptoToBRT();
      }
      // 2. BRT → CRYPTO (через BRTC)
      else if (fromIsBRT && toIsCrypto) {
        await swapBRTToCrypto();
      }
      // 3. CRYPTO → CRYPTO (через BRTC мост)
      else if (fromIsCrypto && toIsCrypto) {
        await swapCryptoToCrypto();
      }
      // 4. BRT → BRTC или BRTC → BRT
      else {
        await swapBRTandBRTC();
      }

    } catch (error) {
      console.error("Swap error:", error);
      addNotification("error", error.message || "Swap failed");
    } finally {
      setLoading(false);
    }
  };

  // CRYPTO → BRT (юзер покупает BRT)
  const swapCryptoToBRT = async () => {
    const isTron = fromCrypto.includes("TRC20");
    
    try {
      // Шаг 1: Отправить crypto на Treasury
      let txHash;
      
      if (isTron) {
        // TronLink
        if (!window.tronWeb || !window.tronWeb.ready) {
          throw new Error("Please install TronLink wallet");
        }

        const treasuryAddress = "TXYZopYRdj2D9XRtbG4uXGobSJpT2fU4Gh"; // TODO: получить из backend
        const amountSun = window.tronWeb.toSun(amount);

        const tx = await window.tronWeb.trx.sendTransaction(treasuryAddress, amountSun);
        
        if (!tx.result) throw new Error("Transaction failed");
        txHash = tx.txid;
        
      } else {
        // MetaMask
        if (!window.ethereum) {
          throw new Error("Please install MetaMask wallet");
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const treasuryAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"; // TODO: получить из backend
        const amountWei = `0x${(parseFloat(amount) * 1e18).toString(16)}`;

        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: accounts[0],
            to: treasuryAddress,
            value: amountWei,
            gas: '0x5208',
          }],
        });
      }

      // 🆕 Используем обратный маппинг для backend
      const backendFromToken = mapTokenToBackend(fromCrypto);
      const backendToToken = mapTokenToBackend(toCrypto);

      // Шаг 2: Отправить на backend для зачисления BRT
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/swap/crypto-to-brt`,
        {
          fromToken: backendFromToken,
          toToken: backendToToken,
          amount: parseFloat(amount),
          txHash,
          chain: isTron ? "tron" : "ethereum"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const receiveAmount = calculateReceiveAmount();
        addNotification("success", `Swapped ${amount} ${fromCrypto} to ${receiveAmount} ${toCrypto}! (Fee: 0.5%)`);
        
        setAmount("");
        
        if (onTransactionComplete) {
          await onTransactionComplete();
        }
        
        setTimeout(() => onClose(), 2000);
      }

    } catch (error) {
      throw error;
    }
  };

  // BRT → CRYPTO (юзер продаёт BRT)
  const swapBRTToCrypto = async () => {
    try {
      // Получаем адрес получателя от пользователя
      const recipientAddress = prompt(
        `Enter your ${toCrypto.includes("TRC20") ? "TronLink" : "MetaMask"} address:`
      );

      if (!recipientAddress) {
        throw new Error("Address is required");
      }

      // Валидация адреса
      const isTron = toCrypto.includes("TRC20");
      if (isTron && !recipientAddress.startsWith("T")) {
        throw new Error("Invalid Tron address");
      }
      if (!isTron && !recipientAddress.startsWith("0x")) {
        throw new Error("Invalid Ethereum address");
      }

      // 🆕 Используем обратный маппинг для backend
      const backendFromToken = mapTokenToBackend(fromCrypto);
      const backendToToken = mapTokenToBackend(toCrypto);

      // Отправить на backend
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/swap/brt-to-crypto`,
        {
          fromToken: backendFromToken,
          toToken: backendToToken,
          amount: parseFloat(amount),
          recipientAddress
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const receiveAmount = calculateReceiveAmount();
        addNotification("success", `Swapped ${amount} ${fromCrypto} to ${receiveAmount} ${toCrypto}! Check your wallet.`);
        
        setAmount("");
        
        if (onTransactionComplete) {
          await onTransactionComplete();
        }
        
        setTimeout(() => onClose(), 2000);
      }

    } catch (error) {
      throw error;
    }
  };

  // CRYPTO → CRYPTO (через BRTC мост)
  const swapCryptoToCrypto = async () => {
    try {
      addNotification("info", "Crypto to Crypto swap requires 2 transactions through BRTC bridge...");
      
      // TODO: Реализовать двойной swap через BRTC
      // Шаг 1: Crypto → BRTC
      // Шаг 2: BRTC → Crypto
      
      throw new Error("Crypto to Crypto swap not yet implemented. Please swap to BRT first.");

    } catch (error) {
      throw error;
    }
  };

  // BRT ↔ BRTC
  const swapBRTandBRTC = async () => {
    try {
      // 🆕 Используем обратный маппинг для backend
      const backendFromToken = mapTokenToBackend(fromCrypto);
      const backendToToken = mapTokenToBackend(toCrypto);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/swap/brt-brtc`,
        {
          fromToken: backendFromToken,
          toToken: backendToToken,
          amount: parseFloat(amount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const receiveAmount = calculateReceiveAmount();
        addNotification("success", `Swapped ${amount} ${fromCrypto} to ${receiveAmount} ${toCrypto}!`);
        
        setAmount("");
        
        if (onTransactionComplete) {
          await onTransactionComplete();
        }
        
        setTimeout(() => onClose(), 2000);
      }

    } catch (error) {
      throw error;
    }
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
              1 {fromCrypto} = {((rates[fromCrypto] || 1) / (rates[toCrypto] || 1)).toFixed(8)} {toCrypto}
            </p>
            <p className="fee-info">Fee: 0.5%</p>
          </div>

          <div className="swap-route-info">
            <small>
              {fromCrypto !== "BRT" && toCrypto === "BRT" && "📥 Route: Send crypto → Treasury → Receive BRT"}
              {fromCrypto === "BRT" && toCrypto !== "BRT" && "📤 Route: BRT deducted → Treasury sends crypto"}
              {fromCrypto !== "BRT" && toCrypto !== "BRT" && fromCrypto !== "BRTC" && toCrypto !== "BRTC" && "🔄 Route: Crypto → BRTC → Crypto (2 transactions)"}
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
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