import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './SuperAdmin.css';

// Импорты компонентов
import Dashboard from './Dashboard';
import UsersManagement from './UsersManagement';
import BalancesManagement from './BalancesManagement';
import SystemBalances from './SystemBalances';
import TransactionsView from './TransactionsView';
import ReferralsTree from './ReferralsTree';
import LogsView from './LogsView';
import BlacklistManagement from './BlacklistManagement';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SuperAdminPanel = ({ addNotification }) => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);

    // Проверяем что пользователь super-admin
    useEffect(() => {
        if (user && user.role !== 'super_admin') {
            window.location.href = '/dashboard';
        }
    }, [user]);

    const handleLogout = () => {
        logout();
    };

    const tabs = [
        { id: 'dashboard', name: '📊 Dashboard', icon: '📊' },
        { id: 'users', name: '👥 Users', icon: '👥' },
        { id: 'balances', name: '💰 Balances', icon: '💰' },
        { id: 'system', name: '⚖️ System', icon: '⚖️' },
        { id: 'transactions', name: '💳 Transactions', icon: '💳' },
        { id: 'referrals', name: '🔗 Referrals', icon: '🔗' },
        { id: 'logs', name: '📋 Logs', icon: '📋' },
        { id: 'blacklist', name: '🚫 Blacklist', icon: '🚫' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'users':
                return <UsersManagement />;
            case 'balances':
                return <BalancesManagement />;
            case 'system':
                return <SystemBalances />;
            case 'transactions':
                return <TransactionsView />;
            case 'referrals':
                return <ReferralsTree />;
            case 'logs':
                return <LogsView />;
            case 'blacklist':
                return <BlacklistManagement />;
            default:
                return <Dashboard />;
        }
    };

    if (!user) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="super-admin-container">
            {/* Header */}
            <header className="super-admin-header">
                <div className="header-left">
                    <h1>🛡️ Super Admin Panel</h1>
                    <span className="header-subtitle">Bruno Token Management System</span>
                </div>
                <div className="header-right">
                    <span className="admin-email">{user.email}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        🚪 Logout
                    </button>
                </div>
            </header>

            <div className="super-admin-main">
                {/* Sidebar */}
                <aside className="super-admin-sidebar">
                    <nav className="sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="sidebar-icon">{tab.icon}</span>
                                <span className="sidebar-text">{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <main className="super-admin-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading...</p>
                        </div>
                    ) : (
                        renderContent()
                    )}
                </main>
            </div>
        </div>
    );
};

export default SuperAdminPanel;