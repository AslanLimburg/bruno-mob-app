import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MyChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMyChallenges();
  }, []);

  const fetchMyChallenges = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Fetch all challenges and filter by creator
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/challenge`);
      const allChallenges = response.data.challenges || [];
      const myChallenges = allChallenges.filter(c => c.creator_id === user.id);
      
      setChallenges(myChallenges);
    } catch (error) {
      console.error('Error fetching my challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (challengeId, action) => {
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      
      let endpoint;
      let payload = {};

      switch (action) {
        case 'open':
          endpoint = `${process.env.REACT_APP_API_URL}/challenge/${challengeId}/open`;
          break;
        case 'close':
          endpoint = `${process.env.REACT_APP_API_URL}/challenge/${challengeId}/close`;
          break;
        case 'resolve':
          const winningOptionId = prompt('Enter winning option ID:');
          if (!winningOptionId) return;
          endpoint = `${process.env.REACT_APP_API_URL}/challenge/${challengeId}/resolve`;
          payload = { winningOptionId: parseInt(winningOptionId) };
          break;
        default:
          return;
      }

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(`✅ Challenge ${action}ed successfully!`);
      fetchMyChallenges(); // Refresh

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || error.message}`);
    }
  };

  const getActionButtons = (challenge) => {
    switch (challenge.status) {
      case 'draft':
        return (
          <button 
            onClick={() => handleAction(challenge.id, 'open')}
            className="action-btn open-btn"
          >
            🚀 Open for Bets
          </button>
        );
      case 'open':
        return (
          <button 
            onClick={() => handleAction(challenge.id, 'close')}
            className="action-btn close-btn"
          >
            🛑 Close Betting
          </button>
        );
      case 'closed_for_bets':
        return (
          <button 
            onClick={() => handleAction(challenge.id, 'resolve')}
            className="action-btn resolve-btn"
          >
            ✅ Resolve
          </button>
        );
      case 'resolved':
        return <span className="resolved-label">✅ Resolved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="my-challenges">
      <div className="my-challenges-header">
        <h2>🏆 My Challenges</h2>
      </div>

      {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

      {loading ? (
        <div className="loading">Loading your challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="no-challenges">
          <p>You haven't created any challenges yet</p>
          <small>Click "Create" tab to create your first challenge!</small>
        </div>
      ) : (
        <div className="challenges-list">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="my-challenge-card">
              <div className="challenge-card-header">
                <h3>{challenge.title}</h3>
                <span className={`status-badge ${challenge.status}`}>
                  {challenge.status.replace('_', ' ')}
                </span>
              </div>

              <div className="challenge-stats">
                <div className="stat">
                  <span className="stat-label">Total Pool</span>
                  <span className="stat-value">{parseFloat(challenge.total_pool || 0).toFixed(2)} BRT</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Bets</span>
                  <span className="stat-value">{challenge.total_bets || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Payout Mode</span>
                  <span className="stat-value">{challenge.payout_mode.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="challenge-actions">
                {getActionButtons(challenge)}
              </div>

              <div className="challenge-date">
                <small>Created: {new Date(challenge.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyChallenges;
