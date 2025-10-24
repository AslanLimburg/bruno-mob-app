// =====================================================
// BRT STARS CHALLENGE - MAIN COMPONENT
// frontend/src/components/stars-challenge/StarsChallenge.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StarsProfile from './StarsProfile';
import StarsChallengeList from './StarsChallengeList';
import StarsGallery from './StarsGallery';
import StarsAdmin from './StarsAdmin';
import './StarsChallenge.css';

const API_URL = process.env.REACT_APP_API_URL;

const StarsChallenge = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [hasGSI, setHasGSI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Check if user is moderator or admin
// Only Stars Admin has access to Admin Panel
const isAdmin = user.email === 'stars-admin@brunotoken.com';  
  useEffect(() => {
    checkGSIActivation();
  }, []);
  
  const checkGSIActivation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/club-avalanche/my-programs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check for GS-I membership
      const gsIMembership = response.data.data?.find(m => 
        m.program === 'GS-I'
      );      
      setHasGSI(!!gsIMembership);
      setLoading(false);
      
    } catch (err) {
      console.error('Check GSI error:', err);
      setHasGSI(false);
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="stars-challenge-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Stars Challenge...</p>
        </div>
      </div>
    );
  }
  
  if (!hasGSI) {
    return (
      <div className="stars-challenge-container">
        <div className="activation-required">
          <div className="activation-card">
            <span className="lock-icon">🔒</span>
            <h2>BRT Stars Challenge</h2>
            <p className="subtitle">Premium Feature</p>
            
            <div className="requirement-box">
              <h3>Activation Required:</h3>
              <ul>
                <li>✅ Club Avalanche GS-I membership</li>
                <li>💎 Cost: 5 BRT</li>
                <li>🎁 Get your referral code</li>
              </ul>
            </div>
            
            <p className="description">
              After activation you will get access to:
            </p>
            
            <div className="features-grid">
              <div className="feature-item">
                <span>📸</span>
                <p>Upload photos</p>
              </div>
              <div className="feature-item">
                <span>⭐</span>
                <p>Receive Stars</p>
              </div>
              <div className="feature-item">
                <span>🏆</span>
                <p>Participate in contests</p>
              </div>
              <div className="feature-item">
                <span>🎯</span>
                <p>Weekly gallery</p>
              </div>
            </div>
            
            <button 
              className="activate-button"
              onClick={() => window.dispatchEvent(new CustomEvent('switchToDashboardTab', { detail: 'club' }))}
            >
              Activate Club Avalanche GS-I
            </button>
            
            <p className="note">
              Activation gives lifetime access to Stars Challenge
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="stars-challenge-container">
      {/* Header */}
      <div className="stars-header">
        <div className="stars-title">
          <h1>⭐ BRT Stars Challenge</h1>
          <p className="stars-subtitle">Upload photos, get Stars, win prizes!</p>
        </div>
        
        <div className="user-stats-mini">
          <div className="stat-item">
            <span className="stat-label">BRT Balance</span>
            <span className="stat-value">{user.balance?.toFixed(2) || '0.00'} BRT</span>
          </div>
        </div>
      </div>
      
      {/* Sub Navigation */}
      <div className="stars-subnav">
        <button 
          className={activeSubTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveSubTab('profile')}
        >
          📸 My Profile
        </button>
        <button 
          className={activeSubTab === 'challenges' ? 'active' : ''}
          onClick={() => setActiveSubTab('challenges')}
        >
          🏆 Challenges
        </button>
        <button 
          className={activeSubTab === 'gallery' ? 'active' : ''}
          onClick={() => setActiveSubTab('gallery')}
        >
          🎯 Gallery
        </button>
      </div>
      
      {/* Content */}
      <div className="stars-content">
        {activeSubTab === 'profile' && <StarsProfile user={user} />}
        {activeSubTab === 'challenges' && <StarsChallengeList user={user} />}
        {activeSubTab === 'gallery' && <StarsGallery user={user} />}
      </div>
      
      {/* Admin Section - Only for Moderators/Admins */}
      {isAdmin && (
        <div className="admin-section-wrapper">
          <div className="admin-divider">
            <button 
              className="admin-toggle-btn"
              onClick={() => setShowAdmin(!showAdmin)}
            >
              🛠️ Admin Panel {showAdmin ? '▼' : '▶'}
            </button>
          </div>
          
          {showAdmin && (
            <div className="admin-panel-content">
              <StarsAdmin user={user} />
            </div>
          )}
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="error-notification">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      
      <style jsx>{`
        .admin-section-wrapper {
          margin-top: 40px;
          border-top: 2px solid #e5e7eb;
          padding-top: 20px;
        }
        
        .admin-divider {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .admin-toggle-btn {
          padding: 12px 32px;
          border: 2px solid #8b5cf6;
          border-radius: 8px;
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          color: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(139, 92, 246, 0.2);
        }
        
        .admin-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(139, 92, 246, 0.3);
        }
        
        .admin-panel-content {
          animation: slideDown 0.3s ease-out;
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StarsChallenge;
