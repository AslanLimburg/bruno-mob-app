// New Dashboard Component - Main
// Path: frontend/src/components/dashboard/DashboardNew.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CryptoBalances from '../CryptoBalances';
import BRTCDexWidget from './BRTCDexWidget';
import SendModal from '../modals/SendModal';
import ReceiveModal from '../modals/ReceiveModal';
import SwapModal from '../modals/SwapModal';
import './DashboardNew.css';

const DashboardNew = ({ addNotification }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [activeTab, setActiveTab] = useState('overview');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [stats, setStats] = useState({
    totalBalance: '16.52',
    totalTransactions: 0,
    referrals: 2,
    lotteryTickets: 12
  });

  // Load user stats
  useEffect(() => {
    // TODO: Загрузить реальную статистику из API
    // loadUserStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFeatureClick = (feature) => {
    switch(feature) {
      case 'club-avalanche':
        navigate('/club-avalanche');
        break;
      case 'challenge':
        navigate('/challenge');
        break;
      case 'messenger':
        navigate('/messenger');
        break;
      case 'stars-challenge':
        navigate('/stars-challenge');
        break;
      case 'vector-destiny':
        navigate('/vector-destiny');
        break;
      case 'kyc':
        navigate('/verification');
        break;
      case 'lottery':
        navigate('/lottery');
        break;
      default:
        addNotification('info', `Opening ${feature}...`);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="tab-content active">
            <h3 className="content-title">Recent Activity</h3>
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-text">No transactions yet</div>
            </div>
          </div>
        );
      
      case 'shop':
        return (
          <div className="tab-content active">
            <h3 className="content-title">Shop</h3>
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>
              <span className="coming-soon-badge">Coming Soon</span>
              <div className="empty-text" style={{marginTop: '15px'}}>
                Marketplace will be available soon
              </div>
            </div>
          </div>
        );
      
      case 'coupons':
        return (
          <div className="tab-content active">
            <h3 className="content-title">Coupons</h3>
            <div className="empty-state">
              <div className="empty-icon">🎟️</div>
              <span className="coming-soon-badge">Coming Soon</span>
              <div className="empty-text" style={{marginTop: '15px'}}>
                Coupon system will be available soon
              </div>
            </div>
          </div>
        );
      
      case 'lottery':
        return (
          <div className="tab-content active">
            <h3 className="content-title">Lottery</h3>
            <div className="empty-state">
              <div className="empty-icon">🎰</div>
              <div className="empty-text">
                Click "Lottery" card below to access full lottery system
              </div>
              <button 
                className="btn-primary"
                onClick={() => handleFeatureClick('lottery')}
                style={{marginTop: '20px'}}
              >
                Open Lottery
              </button>
            </div>
          </div>
        );
      
      case 'transactions':
        return (
          <div className="tab-content active">
            <h3 className="content-title">Transactions</h3>
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-text">No transaction history</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-new-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          {/* Rotating Logo */}
          <div className="logo-rotating">
            <img src="/images/logo.png" alt="Bruno Token" />
          </div>
          
          {/* Static Logo */}
          <div className="logo-static">
            <img src="/images/logo.svg" alt="Bruno Token" />
          </div>
          
          {/* Brand Name */}
          <div className="brand-name">Bruno Token</div>
          
          {/* User Info */}
          <div className="user-info">
            <div className="user-name">{user?.name || user?.email || 'User'}</div>
            <div className="user-details">
              ID: #{user?.id || '-----'} | {user?.email || 'No email'}
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Crypto Balances Section */}
      <CryptoBalances addNotification={addNotification} />

      {/* BRTC DEX Widget */}
      <BRTCDexWidget />

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">💰</span>
            <span className="stat-title">Total Balance</span>
          </div>
          <div className="stat-value">{stats.totalBalance}</div>
          <div className="stat-subtitle">BRT Tokens</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">📊</span>
            <span className="stat-title">Total Transactions</span>
          </div>
          <div className="stat-value">{stats.totalTransactions}</div>
          <div className="stat-subtitle">All time</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">👥</span>
            <span className="stat-title">Referrals</span>
          </div>
          <div className="stat-value">{stats.referrals}</div>
          <div className="stat-subtitle">Active users</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">🎫</span>
            <span className="stat-title">Lottery Tickets</span>
          </div>
          <div className="stat-value">{stats.lotteryTickets}</div>
          <div className="stat-subtitle">This week</div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="nav-cards">
        <div 
          className={`nav-card ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-icon-large">📊</span>
          <div className="nav-content">
            <h4>Overview</h4>
            <p>Recent activity and dashboard summary</p>
          </div>
        </div>

        <div 
          className={`nav-card ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          <span className="nav-icon-large">🛍️</span>
          <div className="nav-content">
            <h4>Shop</h4>
            <p>Browse marketplace and exclusive items</p>
          </div>
        </div>

        <div 
          className={`nav-card ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <span className="nav-icon-large">🎟️</span>
          <div className="nav-content">
            <h4>Coupons</h4>
            <p>Your discount codes and special offers</p>
          </div>
        </div>

        <div 
          className={`nav-card ${activeTab === 'lottery' ? 'active' : ''}`}
          onClick={() => setActiveTab('lottery')}
        >
          <span className="nav-icon-large">🎰</span>
          <div className="nav-content">
            <h4>Lottery</h4>
            <p>Participate in weekly prize draws</p>
          </div>
        </div>

        <div 
          className={`nav-card ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <span className="nav-icon-large">💳</span>
          <div className="nav-content">
            <h4>Transactions</h4>
            <p>View your complete transaction history</p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {renderTabContent()}
      </div>

      {/* Features Grid */}
      <div className="features-grid">
        <div className="feature-btn" onClick={() => handleFeatureClick('club-avalanche')}>
          <span className="feature-icon-large">❄️</span>
          <div className="feature-content">
            <h4>Club Avalanche</h4>
            <p>Exclusive community benefits and rewards</p>
          </div>
        </div>

        <div className="feature-btn" onClick={() => handleFeatureClick('challenge')}>
          <span className="feature-icon-large">🎯</span>
          <div className="feature-content">
            <h4>Challenge</h4>
            <p>Complete tasks and earn rewards</p>
          </div>
        </div>

        <div className="feature-btn" onClick={() => handleFeatureClick('messenger')}>
          <span className="feature-icon-large">💬</span>
          <div className="feature-content">
            <h4>BrunoChat</h4>
            <p>Connect with community members</p>
          </div>
        </div>

        <div className="feature-btn" onClick={() => handleFeatureClick('stars-challenge')}>
          <span className="feature-icon-large">⭐</span>
          <div className="feature-content">
            <h4>BRT Star Challenge</h4>
            <p>Special rewards program</p>
          </div>
        </div>

        <div className="feature-btn" onClick={() => handleFeatureClick('vector-destiny')}>
          <span className="feature-icon-large">✨</span>
          <div className="feature-content">
            <h4>Vector of Destiny</h4>
            <p>Discover your personalized forecast</p>
          </div>
        </div>

        <div className="feature-btn" onClick={() => handleFeatureClick('kyc')}>
          <span className="feature-icon-large">✅</span>
          <div className="feature-content">
            <h4>KYC Verification</h4>
            <p>Verify your identity</p>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="action-buttons">
        <button 
          className="action-btn-text receive"
          onClick={() => setShowReceiveModal(true)}
        >
          Receive
        </button>
        <button 
          className="action-btn-text swap"
          onClick={() => setShowSwapModal(true)}
        >
          Swap
        </button>
        <button 
          className="action-btn-text send"
          onClick={() => setShowSendModal(true)}
        >
          Send
        </button>
      </div>

      {/* Modals */}
      {showSendModal && (
        <SendModal 
          onClose={() => setShowSendModal(false)}
          addNotification={addNotification}
        />
      )}
      
      {showReceiveModal && (
        <ReceiveModal 
          onClose={() => setShowReceiveModal(false)}
          addNotification={addNotification}
        />
      )}
      
      {showSwapModal && (
        <SwapModal 
          onClose={() => setShowSwapModal(false)}
          addNotification={addNotification}
        />
      )}
    </div>
  );
};

export default DashboardNew;
