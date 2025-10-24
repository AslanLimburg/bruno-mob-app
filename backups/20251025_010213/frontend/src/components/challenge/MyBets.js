import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MyBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchMyBets();
  }, [statusFilter]);

  const fetchMyBets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/challenge/my/bets`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );
      setBets(response.data.bets || []);
    } catch (error) {
      console.error('Error fetching my bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'won': return '🏆';
      case 'lost': return '❌';
      case 'active': return '⏳';
      case 'refunded': return '↩️';
      default: return '📊';
    }
  };

  const calculateProfit = (bet) => {
    if (bet.status === 'won') {
      const profit = parseFloat(bet.payout) - parseFloat(bet.amount);
      return profit.toFixed(2);
    }
    return null;
  };

  return (
    <div className="my-bets">
      <div className="my-bets-header">
        <h2>💰 My Bets</h2>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="status-filter"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading your bets...</div>
      ) : bets.length === 0 ? (
        <div className="no-bets">
          <p>No bets found</p>
          <small>Start placing bets to see them here!</small>
        </div>
      ) : (
        <div className="bets-list">
          {bets.map((bet) => (
            <div key={bet.id} className={`bet-card ${bet.status}`}>
              <div className="bet-card-header">
                <h3>{bet.challenge_title}</h3>
                <span className={`status-badge ${bet.status}`}>
                  {getStatusEmoji(bet.status)} {bet.status}
                </span>
              </div>

              <div className="bet-details">
                <div className="bet-option">
                  <span className="label">Your Choice:</span>
                  <span className="value">{bet.option_text}</span>
                </div>

                <div className="bet-stats">
                  <div className="stat">
                    <span className="stat-label">Bet Amount</span>
                    <span className="stat-value">{parseFloat(bet.amount).toFixed(2)} BRT</span>
                  </div>

                  {bet.status === 'won' && (
                    <>
                      <div className="stat">
                        <span className="stat-label">Payout</span>
                        <span className="stat-value win">{parseFloat(bet.payout).toFixed(2)} BRT</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Profit</span>
                        <span className="stat-value profit">+{calculateProfit(bet)} BRT</span>
                      </div>
                    </>
                  )}

                  {bet.status === 'lost' && (
                    <div className="stat">
                      <span className="stat-label">Lost</span>
                      <span className="stat-value loss">-{parseFloat(bet.amount).toFixed(2)} BRT</span>
                    </div>
                  )}

                  {bet.status === 'refunded' && (
                    <div className="stat">
                      <span className="stat-label">Refunded</span>
                      <span className="stat-value">{parseFloat(bet.amount).toFixed(2)} BRT</span>
                    </div>
                  )}
                </div>

                <div className="bet-date">
                  <small>Placed: {new Date(bet.created_at).toLocaleString()}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBets;
