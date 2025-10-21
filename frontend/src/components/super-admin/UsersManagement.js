import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'block', 'blacklist', 'delete', 'details'
    const [reason, setReason] = useState('');
    
    // Фильтры
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        role: '',
        isBlocked: '',
        isBlacklisted: ''
    });
    
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });

    useEffect(() => {
        fetchUsers();
    }, [filters, pagination.page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            console.log('🔍 Fetching users...');
            const response = await axios.get(`${API_URL}/super-admin/users?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Response:', response.data);

            if (response.data.success) {
                console.log('✅ Users loaded:', response.data.data.length, 'users');
                console.log('First user:', response.data.data[0]);
                setUsers(response.data.data);
                setPagination(prev => ({
                    ...prev,
                    ...response.data.pagination
                }));
            }
        } catch (err) {
            console.error('❌ Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, userId) => {
        const token = localStorage.getItem('token');
        
        try {
            let response;
            
            switch (action) {
                case 'block':
                    response = await axios.post(
                        `${API_URL}/super-admin/users/${userId}/block`,
                        { reason },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    break;
                    
                case 'blacklist':
                    response = await axios.post(
                        `${API_URL}/super-admin/users/${userId}/blacklist`,
                        { reason },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    break;
                    
                case 'unblock':
                    response = await axios.post(
                        `${API_URL}/super-admin/users/${userId}/unblock`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    break;
                    
                case 'delete':
                    response = await axios.delete(
                        `${API_URL}/super-admin/users/${userId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    break;
                    
                default:
                    return;
            }

            if (response.data.success) {
                alert(`✅ ${response.data.message}`);
                setShowModal(false);
                setReason('');
                fetchUsers();
            } else {
                alert(`❌ ${response.data.message}`);
            }
        } catch (err) {
            alert(`❌ Error: ${err.response?.data?.message || err.message}`);
        }
    };

    const openModal = (type, user) => {
        setModalType(type);
        setSelectedUser(user);
        setShowModal(true);
        setReason('');
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedUser(null);
        setReason('');
        setModalType('');
    };

    const getUserStatusBadge = (user) => {
        if (user.is_blacklisted) {
            return <span className="badge badge-danger">🚫 Blacklisted</span>;
        }
        if (user.is_blocked) {
            return <span className="badge badge-warning">🔒 Blocked</span>;
        }
        return <span className="badge badge-success">✅ Active</span>;
    };

    console.log('🎨 Rendering UsersManagement. Users:', users.length, 'Loading:', loading);

    return (
        <div className="users-management">
            <div className="management-header">
                <h2>👥 Users Management</h2>
                <button onClick={fetchUsers} className="refresh-btn">🔄 Refresh</button>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <input
                    type="text"
                    placeholder="🔍 Search by email or ID..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="search-input"
                />
                
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="blacklisted">Blacklisted</option>
                </select>

                <select
                    value={filters.role}
                    onChange={(e) => setFilters({...filters, role: e.target.value})}
                    className="filter-select"
                >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                </select>

                <button 
                    onClick={() => setFilters({search: '', status: '', role: '', isBlocked: '', isBlacklisted: ''})}
                    className="clear-filters-btn"
                >
                    ✖️ Clear
                </button>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading users...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="empty-state">
                    <p>No users found</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>BRT Balance</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td className="user-email">{user.email}</td>
                                        <td>
                                            <span className={`role-badge role-${user.role}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>{getUserStatusBadge(user)}</td>
                                        <td className="balance-cell">
                                            {parseFloat(user.brt_balance).toFixed(2)} BRT
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="actions-cell">
                                            {!user.is_blocked && !user.is_blacklisted && (
                                                <>
                                                    <button
                                                        onClick={() => openModal('block', user)}
                                                        className="action-btn-small btn-warning"
                                                        title="Block User"
                                                    >
                                                        🔒
                                                    </button>
                                                    <button
                                                        onClick={() => openModal('blacklist', user)}
                                                        className="action-btn-small btn-danger"
                                                        title="Blacklist User"
                                                    >
                                                        🚫
                                                    </button>
                                                </>
                                            )}
                                            
                                            {user.is_blocked && !user.is_blacklisted && (
                                                <button
                                                    onClick={() => handleAction('unblock', user.id)}
                                                    className="action-btn-small btn-success"
                                                    title="Unblock User"
                                                >
                                                    🔓
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={() => openModal('details', user)}
                                                className="action-btn-small btn-info"
                                                title="View Details"
                                            >
                                                👁️
                                            </button>
                                            
                                            <button
                                                onClick={() => openModal('delete', user)}
                                                className="action-btn-small btn-danger"
                                                title="Delete User"
                                            >
                                                🗑️
                                            </button>
                                        </td>
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {modalType === 'block' && '🔒 Block User'}
                                {modalType === 'blacklist' && '🚫 Blacklist User'}
                                {modalType === 'delete' && '🗑️ Delete User'}
                                {modalType === 'details' && '👁️ User Details'}
                            </h3>
                            <button onClick={closeModal} className="close-btn">✖️</button>
                        </div>
                        
                        <div className="modal-body">
                            {modalType === 'details' ? (
                                <div className="user-details">
                                    <p><strong>ID:</strong> {selectedUser.id}</p>
                                    <p><strong>Email:</strong> {selectedUser.email}</p>
                                    <p><strong>Role:</strong> {selectedUser.role}</p>
                                    <p><strong>Status:</strong> {selectedUser.account_status}</p>
                                    <p><strong>BRT Balance:</strong> {parseFloat(selectedUser.brt_balance).toFixed(8)} BRT</p>
                                    <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
                                    {selectedUser.last_login_at && (
                                        <p><strong>Last Login:</strong> {new Date(selectedUser.last_login_at).toLocaleString()}</p>
                                    )}
                                    {selectedUser.blocked_reason && (
                                        <p><strong>Block Reason:</strong> {selectedUser.blocked_reason}</p>
                                    )}
                                    {selectedUser.blacklist_reason && (
                                        <p><strong>Blacklist Reason:</strong> {selectedUser.blacklist_reason}</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <p>User: <strong>{selectedUser?.email}</strong></p>
                                    
                                    {(modalType === 'block' || modalType === 'blacklist') && (
                                        <div className="form-group">
                                            <label>Reason *</label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="Enter reason for this action..."
                                                rows="4"
                                                className="reason-textarea"
                                            />
                                        </div>
                                    )}
                                    
                                    {modalType === 'delete' && (
                                        <p className="warning-text">
                                            ⚠️ This will soft delete the user. The account will be marked as deleted.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {modalType !== 'details' && (
                            <div className="modal-footer">
                                <button onClick={closeModal} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleAction(modalType, selectedUser.id)}
                                    className={`btn-primary ${modalType === 'delete' || modalType === 'blacklist' ? 'btn-danger' : 'btn-warning'}`}
                                    disabled={(modalType === 'block' || modalType === 'blacklist') && !reason}
                                >
                                    Confirm
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManagement;