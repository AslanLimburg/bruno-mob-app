// Send Modal Component
// Path: frontend/src/components/modals/SendModal.jsx

import React, { useState } from 'react';
import './Modal.css';

const SendModal = ({ onClose, addNotification }) => {
  const [formData, setFormData] = useState({
    token: 'USDT',
    network: 'BSC',
    recipient: '',
    amount: ''
  });
  const [sending, setSending] = useState(false);

  const tokens = [
    { symbol: 'USDT', networks: ['BSC', 'Tron'] },
    { symbol: 'USDC', networks: ['Ethereum'] },
    { symbol: 'TRX', networks: ['Tron'] },
    { symbol: 'BRTC', networks: ['BSC'] }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.recipient || !formData.amount) {
      addNotification('error', 'Please fill all fields');
      return;
    }

    setSending(true);
    
    try {
      // TODO: Интегрировать с Web3 для реальной отправки
      // await sendTransaction(formData);
      
      // Симуляция отправки
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification('success', `${formData.amount} ${formData.token} sent successfully!`);
      onClose();
    } catch (error) {
      addNotification('error', 'Transaction failed: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getAvailableNetworks = () => {
    const token = tokens.find(t => t.symbol === formData.token);
    return token ? token.networks : [];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Token Selection */}
            <div className="form-group">
              <label>Select Token</label>
              <select 
                className="form-select"
                value={formData.token}
                onChange={(e) => handleChange('token', e.target.value)}
              >
                {tokens.map(token => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Network Selection */}
            <div className="form-group">
              <label>Network</label>
              <select 
                className="form-select"
                value={formData.network}
                onChange={(e) => handleChange('network', e.target.value)}
              >
                {getAvailableNetworks().map(network => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Address */}
            <div className="form-group">
              <label>Recipient Address</label>
              <input 
                type="text"
                className="form-input"
                placeholder="0x... or T..."
                value={formData.recipient}
                onChange={(e) => handleChange('recipient', e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="form-group">
              <label>Amount</label>
              <div className="amount-input-wrapper">
                <input 
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  step="0.000001"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                />
                <span className="amount-currency">{formData.token}</span>
              </div>
              <small className="form-hint">Available: 0 {formData.token}</small>
            </div>

            {/* Fee Estimate */}
            <div className="fee-estimate">
              <div className="fee-row">
                <span>Network Fee:</span>
                <span className="fee-value">~0.001 BNB</span>
              </div>
              <div className="fee-row">
                <span>Total:</span>
                <span className="fee-value">{formData.amount || '0'} {formData.token}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <p>
                Please double-check the recipient address. Transactions cannot be reversed.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendModal;
