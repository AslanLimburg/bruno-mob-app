import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChallengeDetails from './ChallengeDetails';

function BrowseChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');

  useEffect(() => {
    fetchChallenges();
  }, [statusFilter, searchTerm]);

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/challenge`, { params });
      setChallenges(response.data.challenges || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeClick = (challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleBack = () => {
    setSelectedChallenge(null);
    fetchChallenges(); // Refresh list
  };

  if (selectedChallenge) {
    return <ChallengeDetails challenge={selectedChallenge} onBack={handleBack} />;
  }

  return (
    <div className="browse-challenges">
      <div className="browse-header">
        <h2>🔍 Browse Challenges</h2>
        
        <div className="browse-filters">
          <input
            type="text"
            placeholder="Search challenges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed_for_bets">Closed for Bets</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="no-challenges">
          <p>No challenges found</p>
          <small>Try adjusting your filters or create a new challenge!</small>
        </div>
      ) : (
        <div className="challenges-grid">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="challenge-card"
              onClick={() => handleChallengeClick(challenge)}
            >
              <div className="challenge-card-header">
                <h3>{challenge.title}</h3>
                <span className={`status-badge ${challenge.status}`}>
                  {challenge.status.replace('_', ' ')}
                </span>
              </div>

              <p className="challenge-description">
                {challenge.description || 'No description provided'}
              </p>

              <div className="challenge-stats">
                <div className="stat">
                  <span className="stat-label">Creator</span>
                  <span className="stat-value">{challenge.creator_name}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Pool</span>
                  <span className="stat-value">{parseFloat(challenge.total_pool || 0).toFixed(2)} BRT</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Bets</span>
                  <span className="stat-value">{challenge.total_bets || 0}</span>
                </div>
              </div>

              <div className="challenge-range">
                <small>Stake: {parseFloat(challenge.min_stake).toFixed(0)} - {parseFloat(challenge.max_stake).toFixed(0)} BRT</small>
              </div>

              <button className="view-details-btn">View Details →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BrowseChallenges;
