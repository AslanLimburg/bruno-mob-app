import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CreateChallenge from './CreateChallenge';
import BrowseChallenges from './BrowseChallenges';
import MyBets from './MyBets';
import MyChallenges from './MyChallenges';
import './Challenge.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Challenge() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [hasGSI, setHasGSI] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGSIAccess();
  }, []);

  const checkGSIAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/club-avalanche/my-programs`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      const hasGSIProgram = data.success && 
        data.data?.some(p => p.program === 'GS-I');
      const isModerator = user?.role === 'moderator';

      setHasGSI(hasGSIProgram || isModerator);
      setLoading(false);
    } catch (err) {
      console.error('Check GS-I error:', err);
      setHasGSI(false);
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return <BrowseChallenges />;
      case 'create':
        return <CreateChallenge />;
      case 'mybets':
        return <MyBets />;
      case 'mychallenges':
        return <MyChallenges />;
      default:
        return <BrowseChallenges />;
    }
  };

  if (loading) {
    return (
      <div className="challenge-container">
        <div className="loading">Loading Challenge...</div>
      </div>
    );
  }

  // Show access denied for non-GS-I members
  if (!hasGSI) {
    return (
      <div className="challenge-container">
        <div className="access-denied" style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #1d2e4a 0%, #0f1e30 100%)',
          border: '2px solid #FFA726',
          borderRadius: '12px',
          marginTop: '40px'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: '#FFA726', fontSize: '2rem', marginBottom: '20px' }}>
            GS-I Members Only
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Challenge 2.0 is exclusively available to GS-I members.<br />
            Activate GS-I program in Club Avalanche to access this premium feature.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switchToDashboardTab', { detail: 'club' }))}
            style={{
              marginTop: '30px',
              padding: '15px 40px',
              background: 'linear-gradient(135deg, #FFA726 0%, #FFB84D 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#0A1929',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Go to Club Avalanche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-container">
      <div className="challenge-header">
        <h1>🎯 Challenge 2.0</h1>
        <p>Create predictions, place bets, win prizes!</p>
      </div>

      <div className="challenge-tabs">
        <button
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          🔍 Browse
        </button>
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ✨ Create
        </button>
        <button
          className={`tab-button ${activeTab === 'mybets' ? 'active' : ''}`}
          onClick={() => setActiveTab('mybets')}
        >
          💰 My Bets
        </button>
        <button
          className={`tab-button ${activeTab === 'mychallenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('mychallenges')}
        >
          🏆 My Challenges
        </button>
      </div>

      <div className="challenge-content">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default Challenge;
