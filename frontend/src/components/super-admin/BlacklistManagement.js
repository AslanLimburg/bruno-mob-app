import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BlacklistManagement = () => {
    const [blacklist, setBlacklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newEntry, setNewEntry] = useState({
        type: 'email',
        value: '',
        reason: ''
    });

    useEffect(() => {
        fetchBlacklist();
    }, []);

    const fetchBlacklist = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/super-admin/blacklist`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setBlacklist(response.data.data);
            }
        } catch (err) {
            console.error('Fetch blacklist error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToBlacklist = async () => {
        if (!newEntry.value || !newEntry.reason) {
            alert('Please fill all fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/super-admin/blacklist`,
                newEntry,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('✅ Added to blacklist successfully');
                setShowModal(false);
                setNewEntry({ type: 'email', value: '', reason: '' });
                fetchBlacklist();
            }
        } catch (err) {
            alert(`❌ Error: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleRemoveFromBlacklist = async (id) => {
        if (!window.confirm('Remove this entry from blacklist?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.delete(
                `${API_URL}/super-admin/blacklist/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('✅ Removed from blacklist');
                fetchBlacklist();
            }
        } catch (err) {
            alert(`❌ Error: ${err.response?.data?.message || err.message}`);
        }
    };

    return (
        <div className="blacklist-management">
            <div className="management-header">
                <h2>🚫 Blacklist Management</h2>
                <div>
                    <button onClick={() => setShowModal(true)} className="add-btn">
                        ➕ Add to Blacklist
                    </button>
                    <button onClick={fetchBlacklist} className="refresh-btn">🔄 Refresh</button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading blacklist...</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="blacklist-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Reason</th>
                                <th>Added By</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blacklist.map(entry => (
                                <tr key={entry.id}>
                                    <td>#{entry.id}</td>
                                    <td>
                                        <span className={`type-badge type-${entry.blacklist_type}`}>
                                            {entry.blacklist_type}
                                        </span>
                                    </td>
                                    <td className="value-cell">{entry.value}</td>
                                    <td className="reason-cell">{entry.reason}</td>
                                    <td className="user-email">{entry.added_by_email || '-'}</td>
                                    <td>{new Date(entry.added_at).toLocaleDateString()}</td>
                                    <td className="actions-cell">
                                        <button
                                            onClick={() => handleRemoveFromBlacklist(entry.id)}
                                            className="action-btn-small btn-danger"
                                            title="Remove from Blacklist"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add to Blacklist Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🚫 Add to Blacklist</h3>
                            <button onClick={() => setShowModal(false)} className="close-btn">✖️</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={newEntry.type}
                                    onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
                                    className="form-select"
                                >
                                    <option value="email">Email</option>
                                    <option value="ip">IP Address</option>
                                    <option value="wallet">Wallet Address</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Value *</label>
                                <input
                                    type="text"
                                    value={newEntry.value}
                                    onChange={(e) => setNewEntry({...newEntry, value: e.target.value})}
                                    placeholder={`Enter ${newEntry.type}...`}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Reason *</label>
                                <textarea
                                    value={newEntry.reason}
                                    onChange={(e) => setNewEntry({...newEntry, reason: e.target.value})}
                                    placeholder="Enter reason for blacklisting..."
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
                                onClick={handleAddToBlacklist}
                                className="btn-danger"
                                disabled={!newEntry.value || !newEntry.reason}
                            >
                                Add to Blacklist
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlacklistManagement;