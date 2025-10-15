import React, { useState, useEffect } from 'react';
import './Admin.css';

const DisputeResolution = ({ dispute, onBack }) => {
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [decision, setDecision] = useState('confirm_result');
  const [newWinningOptionId, setNewWinningOptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchChallengeDetails();
  }, []);

  const fetchChallengeDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/challenge/${dispute.challenge_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch challenge details');
      
      const data = await response.json();
      setChallengeDetails(data.challenge);
      
      // Set default winning option
      if (data.challenge.winning_option_id) {
        setNewWinningOptionId(data.challenge.winning_option_id.toString());
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching challenge details:', error);
      setMessage('Error loading challenge details');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (decision === 'reverse_result' && !newWinningOptionId) {
      setMessage('Please select a new winning option');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const token = localStorage.getItem('token');
      const payload = {
        decision,
        notes
      };

      if (decision === 'reverse_result') {
        payload.new_winning_option_id = parseInt(newWinningOptionId);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/challenge/dispute/${dispute.id}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Dispute resolved successfully!');
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to resolve dispute'}`);
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dispute-resolution">
        <div className="loading">Loading dispute details...</div>
      </div>
    );
  }

  if (!challengeDetails) {
    return (
      <div className="dispute-resolution">
        <div className="error">Failed to load challenge details</div>
        <button onClick={onBack} className="back-btn">← Back to List</button>
      </div>
    );
  }

  return (
    <div className="dispute-resolution">
      <div className="resolution-header">
        <button onClick={onBack} className="back-btn">← Back to List</button>
        <h2>⚖️ Resolve Dispute #{dispute.id}</h2>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Dispute Information */}
      <div className="info-section">
        <h3>Dispute Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Status:</span>
            <span className={`status-badge ${dispute.status}`}>
              {dispute.status}
            </span>
          </div>
          <div className="info-item">
            <span className="label">User:</span>
            <span className="value">{dispute.user_email || `User #${dispute.user_id}`}</span>
          </div>
          <div className="info-item">
            <span className="label">Created:</span>
            <span className="value">{new Date(dispute.created_at).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="label">Deadline:</span>
            <span className="value">{new Date(dispute.deadline).toLocaleString()}</span>
          </div>
        </div>

        <div className="dispute-details">
          <div className="detail-box">
            <strong>Reason:</strong>
            <p>{dispute.reason}</p>
          </div>
          {dispute.evidence && (
            <div className="detail-box">
              <strong>Evidence:</strong>
              <p>{dispute.evidence}</p>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Information */}
      <div className="info-section">
        <h3>Challenge Information</h3>
        <div className="challenge-info">
          <h4>{challengeDetails.title}</h4>
          <p>{challengeDetails.description}</p>

          <div className="challenge-stats">
            <div className="stat">
              <span className="label">Status:</span>
              <span className="value">{challengeDetails.status}</span>
            </div>
            <div className="stat">
              <span className="label">Total Pool:</span>
              <span className="value">{challengeDetails.total_pool} BRT</span>
            </div>
            <div className="stat">
              <span className="label">Total Bets:</span>
              <span className="value">{challengeDetails.total_bets}</span>
            </div>
          </div>

          <div className="options-list">
            <h5>Options:</h5>
            {challengeDetails.options && challengeDetails.options.map(option => (
              <div 
                key={option.id} 
                className={`option-item ${option.id === challengeDetails.winning_option_id ? 'winner' : ''}`}
              >
                <span className="option-text">{option.option_text}</span>
                <div className="option-stats">
                  <span>{option.total_bets || 0} bets</span>
                  <span>{option.total_amount || 0} BRT</span>
                  {option.id === challengeDetails.winning_option_id && (
                    <span className="winner-badge">🏆 Current Winner</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resolution Form */}
      <div className="resolution-form-section">
        <h3>Resolution Decision</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Decision:</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="confirm_result"
                  checked={decision === 'confirm_result'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <div className="radio-content">
                  <strong>✅ Confirm Result</strong>
                  <span>Keep the current winner, reject the dispute</span>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  value="reverse_result"
                  checked={decision === 'reverse_result'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <div className="radio-content">
                  <strong>🔄 Reverse Result</strong>
                  <span>Change the winning option and recalculate payouts</span>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  value="refund_all"
                  checked={decision === 'refund_all'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <div className="radio-content">
                  <strong>↩️ Refund All</strong>
                  <span>Return all stakes to bettors</span>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  value="partial_adjustment"
                  checked={decision === 'partial_adjustment'}
                  onChange={(e) => setDecision(e.target.value)}
                />
                <div className="radio-content">
                  <strong>⚖️ Partial Adjustment</strong>
                  <span>Custom adjustment (requires manual intervention)</span>
                </div>
              </label>
            </div>
          </div>

          {decision === 'reverse_result' && (
            <div className="form-group">
              <label>New Winning Option:</label>
              <select
                value={newWinningOptionId}
                onChange={(e) => setNewWinningOptionId(e.target.value)}
                required
              >
                <option value="">Select winning option</option>
                {challengeDetails.options && challengeDetails.options.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.option_text}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Notes (optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onBack} 
              className="cancel-btn"
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Processing...' : '✅ Resolve Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeResolution;
