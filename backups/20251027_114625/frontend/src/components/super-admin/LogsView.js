import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const LogsView = () => {
    const [activeTab, setActiveTab] = useState('admin');
    const [adminLogs, setAdminLogs] = useState([]);
    const [systemLogs, setSystemLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const endpoint = activeTab === 'admin' ? 'logs/admin' : 'logs/system';
            
            const response = await axios.get(`${API_URL}/super-admin/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                if (activeTab === 'admin') {
                    setAdminLogs(response.data.data);
                } else {
                    setSystemLogs(response.data.data);
                }
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="logs-view">
            <div className="management-header">
                <h2>📋 System Logs</h2>
                <button onClick={fetchLogs} className="refresh-btn">🔄 Refresh</button>
            </div>

            {/* Tabs */}
            <div className="logs-tabs">
                <button
                    className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                >
                    👤 Admin Activity
                </button>
                <button
                    className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    ⚙️ System Logs
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading logs...</p>
                </div>
            ) : (
                <div className="logs-container">
                    {activeTab === 'admin' ? (
                        <table className="logs-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Admin</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Description</th>
                                    <th>IP</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>#{log.id}</td>
                                        <td className="user-email">{log.admin_email}</td>
                                        <td>
                                            <span className="action-badge">{log.action_type}</span>
                                        </td>
                                        <td>{log.target_type} #{log.target_id}</td>
                                        <td className="description-cell">{log.description}</td>
                                        <td>{log.ip_address || '-'}</td>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="logs-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Level</th>
                                    <th>Type</th>
                                    <th>Message</th>
                                    <th>User ID</th>
                                    <th>IP</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {systemLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>#{log.id}</td>
                                        <td>
                                            <span className={`log-level log-${log.log_level}`}>
                                                {log.log_level}
                                            </span>
                                        </td>
                                        <td>{log.log_type || '-'}</td>
                                        <td className="description-cell">{log.message}</td>
                                        <td>{log.user_id || '-'}</td>
                                        <td>{log.ip_address || '-'}</td>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default LogsView;