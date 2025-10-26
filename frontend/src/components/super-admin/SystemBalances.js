import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SystemBalances = () => {
    const [systemAccounts, setSystemAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferForm, setTransferForm] = useState({
        fromAccount: '',
        toAccount: '',
        crypto: 'BRT',
        amount: '',
        reason: ''
    });

    const systemAccountsInfo = {
        1: { name: 'Admin', email: 'admin@brunotoken.com', color: '#8b5cf6' },
        5: { name: 'Aslanlimburg', email: 'aslanlimburg@mail.ru', color: '#ec4899' },
        11: { name: 'Gas Fee', email: 'gasfee@brunotoken.com', color: '#3b82f6' },
        17: { name: 'Treasury', email: 'treasury@brunotoken.com', color: '#10b981' },
        18: { name: 'BRT Star', email: 'brtstar@brunotoken.com', color: '#f59e0b' }
    };

    useEffect(() => {
        fetchSystemBalances();
    }, []);

    const fetchSystemBalances = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/super-admin/system-balances`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSystemAccounts(response.data.data);
            }
        } catch (err) {
            console.error('Fetch system balances error:', err);
            alert('Error loading system balances');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!transferForm.fromAccount || !transferForm.toAccount || !transferForm.amount || !transferForm.reason) {
            alert('Please fill all fields');
            return;
        }

        if (transferForm.fromAccount === transferForm.toAccount) {
            alert('Cannot transfer to the same account');
            return;
        }

        if (parseFloat(transferForm.amount) <= 0) {
            alert('Amount must be positive');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/super-admin/system-transfer`,
                transferForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('✅ Transfer completed successfully');
                setShowTransferModal(false);
                setTransferForm({
                    fromAccount: '',
                    toAccount: '',
                    crypto: 'BRT',
                    amount: '',
                    reason: ''
                });
                fetchSystemBalances();
            }
        } catch (err) {
            alert(`❌ Error: ${err.response?.data?.message || err.message}`);
        }
    };

    const getAccountBalance = (userId, crypto) => {
        const account = systemAccounts.find(acc => acc.user_id === userId && acc.crypto === crypto);
        return account ? parseFloat(account.balance).toFixed(2) : '0.00';
    };

    return (
        <div className="system-balances">
            <div className="management-header">
                <h2>⚖️ System Balances Management</h2>
                <div className="header-actions">
                    <button onClick={() => setShowTransferModal(true)} className="btn-primary">
                        💸 Transfer Between Accounts
                    </button>
                    <button onClick={fetchSystemBalances} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading system balances...</p>
                </div>
            ) : (
                <div className="system-accounts-grid">
                    {Object.entries(systemAccountsInfo).map(([userId, info]) => (
                        <div 
                            key={userId} 
                            className="system-account-card"
                            style={{ borderLeft: `4px solid ${info.color}` }}
                        >
                            <div className="account-header">
                                <h3>{info.name}</h3>
                                <span className="account-id">ID: {userId}</span>
                            </div>
                            <div className="account-email">{info.email}</div>
                            
                            <div className="account-balances">
                                <div className="balance-item">
                                    <span className="balance-label">BRT</span>
                                    <span className="balance-value">
                                        {getAccountBalance(parseInt(userId), 'BRT')}
                                    </span>
                                </div>
                                <div className="balance-item">
                                    <span className="balance-label">BTC</span>
                                    <span className="balance-value">
                                        {parseFloat(getAccountBalance(parseInt(userId), 'BTC')).toFixed(8)}
                                    </span>
                                </div>
                                <div className="balance-item">
                                    <span className="balance-label">ETH</span>
                                    <span className="balance-value">
                                        {parseFloat(getAccountBalance(parseInt(userId), 'ETH')).toFixed(8)}
                                    </span>
                                </div>
                                <div className="balance-item">
                                    <span className="balance-label">USDT</span>
                                    <span className="balance-value">
                                        {getAccountBalance(parseInt(userId), 'USDT')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💸 Transfer Between System Accounts</h3>
                            <button onClick={() => setShowTransferModal(false)} className="close-btn">✖️</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label>From Account *</label>
                                <select
                                    value={transferForm.fromAccount}
                                    onChange={(e) => setTransferForm({...transferForm, fromAccount: e.target.value})}
                                    className="form-select"
                                >
                                    <option value="">Select account...</option>
                                    {Object.entries(systemAccountsInfo).map(([userId, info]) => (
                                        <option key={userId} value={userId}>
                                            {info.name} ({info.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="transfer-arrow">⬇️</div>

                            <div className="form-group">
                                <label>To Account *</label>
                                <select
                                    value={transferForm.toAccount}
                                    onChange={(e) => setTransferForm({...transferForm, toAccount: e.target.value})}
                                    className="form-select"
                                >
                                    <option value="">Select account...</option>
                                    {Object.entries(systemAccountsInfo).map(([userId, info]) => (
                                        <option key={userId} value={userId}>
                                            {info.name} ({info.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cryptocurrency *</label>
                                    <select
                                        value={transferForm.crypto}
                                        onChange={(e) => setTransferForm({...transferForm, crypto: e.target.value})}
                                        className="form-select"
                                    >
                                        <option value="BRT">BRT</option>
                                        <option value="BTC">BTC</option>
                                        <option value="ETH">ETH</option>
                                        <option value="USDT">USDT</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Amount *</label>
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        value={transferForm.amount}
                                        onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                                        placeholder="Enter amount"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Reason *</label>
                                <textarea
                                    value={transferForm.reason}
                                    onChange={(e) => setTransferForm({...transferForm, reason: e.target.value})}
                                    placeholder="Enter reason for transfer..."
                                    rows="3"
                                    className="reason-textarea"
                                />
                            </div>

                            {transferForm.fromAccount && transferForm.crypto && (
                                <div className="balance-info">
                                    <strong>Available Balance:</strong>{' '}
                                    {getAccountBalance(parseInt(transferForm.fromAccount), transferForm.crypto)}{' '}
                                    {transferForm.crypto}
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={() => setShowTransferModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                className="btn-primary"
                                disabled={
                                    !transferForm.fromAccount || 
                                    !transferForm.toAccount || 
                                    !transferForm.amount || 
                                    !transferForm.reason
                                }
                            >
                                Confirm Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .system-accounts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }

                .system-account-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .account-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .account-header h3 {
                    margin: 0;
                    font-size: 20px;
                }

                .account-id {
                    font-size: 12px;
                    color: #666;
                    background: #f3f4f6;
                    padding: 4px 8px;
                    border-radius: 4px;
                }

                .account-email {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 16px;
                }

                .account-balances {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .balance-item {
                    background: #f9fafb;
                    padding: 12px;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                }

                .balance-label {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 4px;
                }

                .balance-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: #111;
                }

                .transfer-arrow {
                    text-align: center;
                    font-size: 24px;
                    margin: 16px 0;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .balance-info {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 8px;
                    padding: 12px;
                    margin-top: 16px;
                    color: #0369a1;
                }

                .modal-large {
                    max-width: 600px;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }
            `}</style>
        </div>
    );
};

export default SystemBalances;