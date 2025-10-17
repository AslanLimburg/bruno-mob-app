// =====================================================
// BRT STARS CHALLENGE - MAIN COMPONENT
// frontend/src/components/stars-challenge/StarsChallenge.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StarsProfile from './StarsProfile';
import StarsChallengeList from './StarsChallengeList';
import StarsGallery from './StarsGallery';
import './StarsChallenge.css';

const API_URL = process.env.REACT_APP_API_URL;

const StarsChallenge = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [hasGSI, setHasGSI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
      
      {/* Error Display */}
      {error && (
        <div className="error-notification">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
    </div>
  );
};

export default StarsChallenge;