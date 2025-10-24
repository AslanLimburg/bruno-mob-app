import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BalancesManagement = () => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        crypto: 'BRT',
        amount: '',
        reason: ''
    });

    useEffect(() => {
        fetchBalances();
    }, []);

    const fetchBalances = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/super-admin/balances`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setBalances(response.data.data);
            }
        } catch (err) {
            console.error('Fetch balances error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustBalance = async () => {
        if (!adjustForm.amount || !adjustForm.reason) {
            alert('Please fill all fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/super-admin/balances/${selectedUser.id}/adjust`,
                adjustForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('✅ Balance adjusted successfully');
                setShowModal(false);
                setAdjustForm({ crypto: 'BRT', amount: '', reason: '' });
                fetchBalances();
            }
        } catch (err) {
            alert(`❌ Error: ${err.response?.data?.message || err.message}`);
        }
    };

    const openAdjustModal = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    // Группируем балансы по пользователям
    const groupedBalances = balances.reduce((acc, balance) => {
        if (!acc[balance.id]) {
            acc[balance.id] = {
                id: balance.id,
                email: balance.email,
                balances: {}
            };
        }
        acc[balance.id].balances[balance.crypto] = balance.balance;
        return acc;
    }, {});

    const users = Object.values(groupedBalances);

    return (
        <div className="balances-management">
            <div className="management-header">
                <h2>💰 Balances Management</h2>
                <button onClick={fetchBalances} className="refresh-btn">🔄 Refresh</button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading balances...</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="balances-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Email</th>
                                <th>BRT</th>
                                <th>BTC</th>
                                <th>ETH</th>
                                <th>USDT</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td className="user-email">{user.email}</td>
                                    <td className="balance-cell">
                                        {parseFloat(user.balances.BRT || 0).toFixed(2)}
                                    </td>
                                    <td className="balance-cell">
                                        {parseFloat(user.balances.BTC || 0).toFixed(8)}
                                    </td>
                                    <td className="balance-cell">
                                        {parseFloat(user.balances.ETH || 0).toFixed(8)}
                                    </td>
                                    <td className="balance-cell">
                                        {parseFloat(user.balances.USDT || 0).toFixed(2)}
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => openAdjustModal(user)}
                                            className="action-btn-small btn-primary"
                                            title="Adjust Balance"
                                        >
                                            💸 Adjust
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Adjust Balance Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💸 Adjust Balance</h3>
                            <button onClick={() => setShowModal(false)} className="close-btn">✖️</button>
                        </div>
                        
                        <div className="modal-body">
                            <p>User: <strong>{selectedUser?.email}</strong></p>
                            
                            <div className="form-group">
                                <label>Cryptocurrency</label>
                                <select
                                    value={adjustForm.crypto}
                                    onChange={(e) => setAdjustForm({...adjustForm, crypto: e.target.value})}
                                    className="form-select"
                                >
                                    <option value="BRT">BRT</option>
                                    <option value="BTC">BTC</option>
                                    <option value="ETH">ETH</option>
                                    <option value="USDT">USDT</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Amount (use negative to deduct)</label>
                                <input
                                    type="number"
                                    step="0.00000001"
                                    value={adjustForm.amount}
                                    onChange={(e) => setAdjustForm({...adjustForm, amount: e.target.value})}
                                    placeholder="e.g. 100 or -50"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Reason *</label>
                                <textarea
                                    value={adjustForm.reason}
                                    onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})}
                                    placeholder="Enter reason for adjustment..."
                                    rows="3"
                                    className="reason-textarea"
                                />
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={() => setShowModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleAdjustBalance}
                                className="btn-primary"
                                disabled={!adjustForm.amount || !adjustForm.reason}
                            >
                                Confirm Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BalancesManagement;