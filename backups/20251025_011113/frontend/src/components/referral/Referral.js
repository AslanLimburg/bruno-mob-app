import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Referral.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const Referral = ({ addNotification }) => {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    referrals: [],
    recentPayouts: []
  });

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Получить код и ссылку
      const codeResponse = await axios.get(`${API_URL}/referral/my-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (codeResponse.data.success) {
        setReferralCode(codeResponse.data.data.referralCode);
        setReferralLink(codeResponse.data.data.referralLink);
      }
      
      // Получить статистику
      const statsResponse = await axios.get(`${API_URL}/referral/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Load referral data error:', error);
      addNotification('error', 'Failed to load referral data');
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    addNotification('success', `${type} copied to clipboard!`);
  };

  if (loading) {
    return (
      <div className="referral-container">
        <div className="referral-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="referral-container">
      <h1 className="referral-title">Referral Program</h1>
      <p className="referral-subtitle">Invite friends and earn rewards!</p>

      {/* Referral Code Card */}
      <div className="referral-card">
        <h2>Your Referral Code</h2>
        <div className="referral-code-box">
          <span className="referral-code">{referralCode}</span>
          <button 
            className="copy-button" 
            onClick={() => copyToClipboard(referralCode, 'Code')}
          >
            📋 Copy
          </button>
        </div>
        
        <div className="referral-link-box">
          <input 
            type="text" 
            value={referralLink} 
            readOnly 
            className="referral-link-input"
          />
          <button 
            className="copy-button" 
            onClick={() => copyToClipboard(referralLink, 'Link')}
          >
            📋 Copy Link
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="referral-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalReferrals}</div>
          <div className="stat-label">Total Referrals</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{stats.totalEarnings.toFixed(2)} BRT</div>
          <div className="stat-label">Total Earnings</div>
        </div>
      </div>

      {/* How it works */}
      <div className="referral-card">
        <h2>How It Works</h2>
        <div className="how-it-works">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Share Your Code</h3>
              <p>Share your referral code or link with friends</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>They Sign Up</h3>
              <p>When they register using your code</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>You Earn Rewards</h3>
              <p>Get BRT rewards based on your membership tier</p>
            </div>
          </div>
        </div>
        
        <div className="reward-tiers">
          <h3>Reward Tiers</h3>
          <div className="tiers-grid">
            <div className="tier">
              <span className="tier-name">GS-I</span>
              <span className="tier-reward">0.88 BRT</span>
            </div>
            <div className="tier">
              <span className="tier-name">GS-II</span>
              <span className="tier-reward">4.98 BRT</span>
            </div>
            <div className="tier">
              <span className="tier-name">GS-III</span>
              <span className="tier-reward">34.98 BRT</span>
            </div>
            <div className="tier">
              <span className="tier-name">GS-IV</span>
              <span className="tier-reward">61.48 BRT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      {stats.referrals.length > 0 && (
        <div className="referral-card">
          <h2>Your Referrals ({stats.totalReferrals})</h2>
          <div className="referrals-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.referrals.map(ref => (
                  <tr key={ref.id}>
                    <td>{ref.name}</td>
                    <td>{ref.email}</td>
                    <td>{new Date(ref.joinedDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payouts */}
      {stats.recentPayouts.length > 0 && (
        <div className="referral-card">
          <h2>Recent Payouts</h2>
          <div className="payouts-list">
            {stats.recentPayouts.map(payout => (
              <div key={payout.id} className="payout-item">
                <div className="payout-info">
                  <span className="payout-amount">+{payout.amount.toFixed(2)} BRT</span>
                  <span className="payout-from">from {payout.referredName || payout.referredEmail}</span>
                </div>
                <span className="payout-date">
                  {new Date(payout.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Referral;
