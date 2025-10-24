import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TransactionsView = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        crypto: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    useEffect(() => {
        fetchTransactions();
    }, [filters, pagination.page]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const response = await axios.get(`${API_URL}/super-admin/transactions?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setTransactions(response.data.data);
                setPagination(prev => ({
                    ...prev,
                    ...response.data.pagination
                }));
            }
        } catch (err) {
            console.error('Fetch transactions error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: <span className="badge badge-success">✅ Completed</span>,
            pending: <span className="badge badge-warning">⏳ Pending</span>,
            failed: <span className="badge badge-danger">❌ Failed</span>,
            cancelled: <span className="badge badge-secondary">🚫 Cancelled</span>
        };
        return badges[status] || <span className="badge">{status}</span>;
    };

    return (
        <div className="transactions-view">
            <div className="management-header">
                <h2>💳 Transactions</h2>
                <button onClick={fetchTransactions} className="refresh-btn">🔄 Refresh</button>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <select
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="filter-select"
                >
                    <option value="">All Types</option>
                    <option value="transfer">Transfer</option>
                    <option value="lottery">Lottery</option>
                    <option value="challenge">Challenge</option>
                    <option value="reward">Reward</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                </select>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                <select
                    value={filters.crypto}
                    onChange={(e) => setFilters({...filters, crypto: e.target.value})}
                    className="filter-select"
                >
                    <option value="">All Cryptos</option>
                    <option value="BRT">BRT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="USDT">USDT</option>
                </select>

                <button 
                    onClick={() => setFilters({type: '', status: '', crypto: ''})}
                    className="clear-filters-btn"
                >
                    ✖️ Clear
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading transactions...</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="transactions-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>#{tx.id}</td>
                                        <td className="user-email">{tx.from_email || '-'}</td>
                                        <td className="user-email">{tx.to_email || '-'}</td>
                                        <td className="amount-cell">
                                            {parseFloat(tx.amount).toFixed(8)} {tx.crypto}
                                        </td>
                                        <td>
                                            <span className="type-badge">{tx.type}</span>
                                        </td>
                                        <td>{getStatusBadge(tx.status)}</td>
                                        <td>{new Date(tx.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        <button
                            onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                            disabled={pagination.page === 1}
                            className="pagination-btn"
                        >
                            ← Previous
                        </button>
                        
                        <span className="pagination-info">
                            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </span>
                        
                        <button
                            onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                            disabled={pagination.page === pagination.pages}
                            className="pagination-btn"
                        >
                            Next →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionsView;