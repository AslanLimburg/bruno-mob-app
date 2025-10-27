import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ChallengeDetails({ challenge, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [challenge.id]);

  const fetchDetails = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/challenge/${challenge.id}`);
      setDetails(response.data);
    } catch (error) {
      console.error('Error fetching challenge details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async (e) => {
    e.preventDefault();
    setBetting(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${process.env.REACT_APP_API_URL}/challenge/${challenge.id}/bets`,
        {
          optionId: parseInt(selectedOption),
          amount: parseFloat(betAmount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('✅ Bet placed successfully!');
      setBetAmount('');
      setSelectedOption('');
      
      // Refresh details
      setTimeout(() => {
        fetchDetails();
        setMessage('');
      }, 2000);

    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || error.message}`);
    } finally {
      setBetting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading challenge details...</div>;
  }

  if (!details) {
    return <div className="error">Failed to load challenge details</div>;
  }

  const canPlaceBet = details.challenge.status === 'open';
  const isResolved = details.challenge.status === 'resolved';

  return (
    <div className="challenge-details">
      <button onClick={onBack} className="back-btn">← Back to Browse</button>

      <div className="details-header">
        <h2>{details.challenge.title}</h2>
        <span className={`status-badge ${details.challenge.status}`}>
          {details.challenge.status.replace('_', ' ')}
        </span>
      </div>

      <div className="details-info">
        <p className="description">{details.challenge.description || 'No description provided'}</p>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Creator</span>
            <span className="info-value">{details.challenge.creator_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Payout Mode</span>
            <span className="info-value">{details.challenge.payout_mode.replace('_', ' ')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Pool</span>
            <span className="info-value">{parseFloat(details.total_pool || 0).toFixed(2)} BRT</span>
          </div>
          <div className="info-item">
            <span className="info-label">Stake Range</span>
            <span className="info-value">
              {parseFloat(details.challenge.min_stake).toFixed(0)} - {parseFloat(details.challenge.max_stake).toFixed(0)} BRT
            </span>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="options-section">
        <h3>Options</h3>
        <div className="options-list">
          {details.options.map((option) => (
            <div key={option.id} className={`option-card ${isResolved && option.id === details.challenge.winning_option_id ? 'winner' : ''}`}>
              <div className="option-header">
                <h4>
                  {option.option_text}
                  {isResolved && option.id === details.challenge.winning_option_id && ' 🏆'}
                </h4>
              </div>
              <div className="option-stats">
                <div className="stat">
                  <span className="stat-label">Total Bets</span>
                  <span className="stat-value">{option.bet_count || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Staked</span>
                  <span className="stat-value">{parseFloat(option.total_amount || 0).toFixed(2)} BRT</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Place Bet Form */}
      {canPlaceBet && (
        <div className="bet-form-section">
          <h3>Place Your Bet</h3>
          <form onSubmit={handlePlaceBet} className="bet-form">
            <div className="form-group">
              <label>Select Option</label>
              <select
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                required
              >
                <option value="">Choose an option...</option>
                {details.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.option_text}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Bet Amount (BRT)</label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder={`Min: ${parseFloat(details.challenge.min_stake).toFixed(0)}, Max: ${parseFloat(details.challenge.max_stake).toFixed(0)}`}
                step="0.01"
                min={details.challenge.min_stake}
                max={details.challenge.max_stake}
                required
              />
            </div>

            <button type="submit" disabled={betting} className="place-bet-btn">
              {betting ? 'Placing Bet...' : '💰 Place Bet'}
            </button>

            {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
          </form>
        </div>
      )}

      {!canPlaceBet && !isResolved && (
        <div className="info-message">
          This challenge is no longer accepting bets.
        </div>
      )}

      {isResolved && (
        <div className="resolved-message">
          ✅ This challenge has been resolved. Check "My Bets" to see if you won!
        </div>
      )}
    </div>
  );
}

export default ChallengeDetails;
