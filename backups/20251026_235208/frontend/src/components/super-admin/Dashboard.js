import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/super-admin/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setStats(response.data.data);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <p>❌ Error: {error}</p>
                <button onClick={fetchStats} className="retry-btn">🔄 Retry</button>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">📊 System Overview</h2>

            {/* Main Stats Cards */}
            <div className="stats-grid">
                {/* Users Stats */}
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Total Users</h3>
                        <p className="stat-value">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card stat-success">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Active Users</h3>
                        <p className="stat-value">{stats.activeUsers.toLocaleString()}</p>
                        <span className="stat-subtitle">Last 7 days</span>
                    </div>
                </div>

                <div className="stat-card stat-warning">
                    <div className="stat-icon">🔒</div>
                    <div className="stat-content">
                        <h3>Blocked Users</h3>
                        <p className="stat-value">{stats.blockedUsers.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card stat-danger">
                    <div className="stat-icon">🚫</div>
                    <div className="stat-content">
                        <h3>Blacklisted</h3>
                        <p className="stat-value">{stats.blacklistedUsers.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card stat-info">
                    <div className="stat-icon">🆕</div>
                    <div className="stat-content">
                        <h3>New Users</h3>
                        <p className="stat-value">{stats.newUsers.toLocaleString()}</p>
                        <span className="stat-subtitle">Last 7 days</span>
                    </div>
                </div>

                {/* Financial Stats */}
                <div className="stat-card stat-primary">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>Total BRT</h3>
                        <p className="stat-value">{stats.totalBRT.toLocaleString(undefined, {maximumFractionDigits: 2})} BRT</p>
                        <span className="stat-subtitle">In circulation</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💳</div>
                    <div className="stat-content">
                        <h3>Transactions</h3>
                        <p className="stat-value">{stats.recentTransactions.toLocaleString()}</p>
                        <span className="stat-subtitle">Last 7 days</span>
                    </div>
                </div>
            </div>

            {/* Club Avalanche Stats */}
            {stats.clubMembers && stats.clubMembers.length > 0 && (
                <div className="club-stats">
                    <h3 className="section-title">⛷️ Club Avalanche Memberships</h3>
                    <div className="club-grid">
                        {stats.clubMembers.map((item, index) => (
                            <div key={index} className="club-card">
                                <h4>{item.program}</h4>
                                <p className="club-count">{item.count} members</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3 className="section-title">⚡ Quick Actions</h3>
                <div className="actions-grid">
                    <button className="action-btn" onClick={fetchStats}>
                        🔄 Refresh Stats
                    </button>
                    <button className="action-btn">
                        📧 Send Notification
                    </button>
                    <button className="action-btn">
                        📊 Generate Report
                    </button>
                    <button className="action-btn">
                        🔧 System Settings
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
                <h3 className="section-title">🕐 System Status</h3>
                <div className="status-items">
                    <div className="status-item status-good">
                        <span className="status-dot"></span>
                        <span>Database: Connected</span>
                    </div>
                    <div className="status-item status-good">
                        <span className="status-dot"></span>
                        <span>API Server: Running</span>
                    </div>
                    <div className="status-item status-warning">
                        <span className="status-dot"></span>
                        <span>Cloudinary: Not configured</span>
                    </div>
                    <div className="status-item status-good">
                        <span className="status-dot"></span>
                        <span>Email Service: Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;