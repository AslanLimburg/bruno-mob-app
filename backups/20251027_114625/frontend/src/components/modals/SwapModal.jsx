// Swap Modal Component
// Path: frontend/src/components/modals/SwapModal.jsx

import React, { useState } from 'react';
import './Modal.css';

const SwapModal = ({ onClose, addNotification }) => {
  const [formData, setFormData] = useState({
    fromToken: 'USDT',
    toToken: 'BRTC',
    fromAmount: '',
    toAmount: ''
  });
  const [swapping, setSwapping] = useState(false);

  const tokens = [
    { symbol: 'USDT', balance: 0 },
    { symbol: 'USDC', balance: 0 },
    { symbol: 'BRTC', balance: 0 },
    { symbol: 'BNB', balance: 0 }
  ];

  // Мок-функция для расчета обмена
  const calculateSwap = (from, amount) => {
    // TODO: Интегрировать с реальным API DEX для получения курса
    const mockRate = 0.000445; // 1 BRTC = 0.000445 USDT
    
    if (formData.fromToken === 'USDT' && formData.toToken === 'BRTC') {
      return (parseFloat(amount) / mockRate).toFixed(6);
    } else if (formData.fromToken === 'BRTC' && formData.toToken === 'USDT') {
      return (parseFloat(amount) * mockRate).toFixed(6);
    }
    
    return '0';
  };

  const handleFromAmountChange = (value) => {
    setFormData(prev => ({
      ...prev,
      fromAmount: value,
      toAmount: calculateSwap('from', value)
    }));
  };

  const handleSwapTokens = () => {
    setFormData(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.fromAmount || parseFloat(formData.fromAmount) <= 0) {
      addNotification('error', 'Please enter a valid amount');
      return;
    }

    setSwapping(true);
    
    try {
      // TODO: Интегрировать с PancakeSwap / DEX для реального обмена
      // await executeSwap(formData);
      
      // Симуляция обмена
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification('success', `Swapped ${formData.fromAmount} ${formData.fromToken} to ${formData.toAmount} ${formData.toToken}`);
      onClose();
    } catch (error) {
      addNotification('error', 'Swap failed: ' + error.message);
    } finally {
      setSwapping(false);
    }
  };

  const getTokenBalance = (symbol) => {
    const token = tokens.find(t => t.symbol === symbol);
    return token ? token.balance : 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content swap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Swap Tokens</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* From Token */}
            <div className="swap-section">
              <div className="swap-header">
                <label>From</label>
                <small>Balance: {getTokenBalance(formData.fromToken)}</small>
              </div>
              <div className="swap-input-group">
                <input 
                  type="number"
                  className="swap-input"
                  placeholder="0.0"
                  step="0.000001"
                  value={formData.fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                />
                <select 
                  className="token-select"
                  value={formData.fromToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromToken: e.target.value }))}
                >
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="swap-arrow-container">
              <button 
                type="button"
                className="swap-arrow-btn"
                onClick={handleSwapTokens}
              >
                ⇅
              </button>
            </div>

            {/* To Token */}
            <div className="swap-section">
              <div className="swap-header">
                <label>To</label>
                <small>Balance: {getTokenBalance(formData.toToken)}</small>
              </div>
              <div className="swap-input-group">
                <input 
                  type="number"
                  className="swap-input"
                  placeholder="0.0"
                  value={formData.toAmount}
                  readOnly
                />
                <select 
                  className="token-select"
                  value={formData.toToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, toToken: e.target.value }))}
                >
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Details */}
            {formData.fromAmount && (
              <div className="swap-details">
                <div className="detail-row">
                  <span>Rate:</span>
                  <span>1 {formData.fromToken} = {calculateSwap('rate', 1)} {formData.toToken}</span>
                </div>
                <div className="detail-row">
                  <span>Slippage:</span>
                  <span>0.5%</span>
                </div>
                <div className="detail-row">
                  <span>Network Fee:</span>
                  <span>~0.001 BNB</span>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <p>
                Swap is powered by PancakeSwap. Make sure you have enough BNB for gas fees.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={swapping}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={swapping || !formData.fromAmount}
            >
              {swapping ? 'Swapping...' : 'Swap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SwapModal;
