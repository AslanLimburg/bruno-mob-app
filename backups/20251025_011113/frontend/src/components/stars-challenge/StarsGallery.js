// =====================================================
// BRT STARS CHALLENGE - GALLERY COMPONENT
// frontend/src/components/stars-challenge/StarsGallery.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const StarsGallery = ({ user }) => {
  const [nominations, setNominations] = useState([]);
  const [selectedNomination, setSelectedNomination] = useState(null);
  const [winners, setWinners] = useState([]);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadNominations();
  }, []);
  
  useEffect(() => {
    if (selectedNomination) {
      loadGalleryWinners(selectedNomination.id);
      loadCurrentWeekWinner(selectedNomination.id);
    }
  }, [selectedNomination]);
  
  const loadNominations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/gallery/nominations`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      const noms = response.data.nominations || [];
      setNominations(noms);
      
      // Автоматически выбрать первую номинацию
      if (noms.length > 0) {
        setSelectedNomination(noms[0]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Load nominations error:', err);
      setLoading(false);
    }
  };
  
  const loadGalleryWinners = async (nominationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/gallery/${nominationId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setWinners(response.data.winners || []);
    } catch (err) {
      console.error('Load gallery winners error:', err);
    }
  };
  
  const loadCurrentWeekWinner = async (nominationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/gallery/${nominationId}/current-winner`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCurrentWinner(response.data.winner);
    } catch (err) {
      console.error('Load current winner error:', err);
    }
  };
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }
  
  return (
    <div className="stars-gallery">
      {/* Header */}
      <div className="gallery-header">
        <h2>🎯 Winners Gallery</h2>
        <p className="gallery-subtitle">Hall of Fame - Weekly Champions</p>
      </div>
      
      {/* Nominations Tabs */}
      {nominations.length > 0 && (
        <div className="nominations-tabs">
          {nominations.map(nom => (
            <button
              key={nom.id}
              className={selectedNomination?.id === nom.id ? 'active' : ''}
              onClick={() => setSelectedNomination(nom)}
            >
              {nom.title}
              <span className="winners-count">({nom.winners_count || 0})</span>
            </button>
          ))}
        </div>
      )}
      
      {selectedNomination && (
        <>
          {/* Current Week Winner (Featured) */}
          {currentWinner && (
            <div className="featured-winner-section">
              <div className="featured-badge">🏆 Winner of Week {currentWinner.week_number}</div>
              
              <div className="featured-winner-card">
                <div className="featured-photo">
                  <img src={currentWinner.photo_url} alt="Current Winner" />
                  <div className="crown-overlay">👑</div>
                </div>
                
                <div className="featured-info">
                  <h3>{currentWinner.winner_name}</h3>
                  <p className="challenge-title">{currentWinner.challenge_title}</p>
                  
                  <div className="featured-stats">
                    <div className="stat">
                      <span className="stat-icon">⭐</span>
                      <div>
                        <span className="stat-number">{currentWinner.total_stars}</span>
                        <span className="stat-label">Total Stars</span>
                      </div>
                    </div>
                    
                    <div className="stat">
                      <span className="stat-icon">💰</span>
                      <div>
                        <span className="stat-number">{parseFloat(currentWinner.total_brt_won).toFixed(2)}</span>
                        <span className="stat-label">BRT Won</span>
                      </div>
                    </div>
                    
                    <div className="stat">
                      <span className="stat-icon">📅</span>
                      <div>
                        <span className="stat-number">{new Date(currentWinner.win_date).toLocaleDateString()}</span>
                        <span className="stat-label">Win Date</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Past Winners Grid (52 places) */}
          <div className="past-winners-section">
            <h3>📜 Past Winners</h3>
            <p className="past-winners-subtitle">Top 52 weekly champions</p>
            
            {winners.length > 0 ? (
              <div className="winners-grid">
                {winners.map((winner, index) => (
                  <div 
                    key={winner.id} 
                    className={`winner-card ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : ''}`}
                  >
                    <div className="winner-rank">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${winner.rank}`}
                    </div>
                    
                    <div className="winner-photo-container">
                      <img src={winner.photo_url} alt={`Winner ${winner.rank}`} />
                      
                      {winner.user_id === user.id && (
                        <div className="you-badge">✨ You</div>
                      )}
                    </div>
                    
                    <div className="winner-info-mini">
                      <h4 className="winner-name">{winner.winner_name}</h4>
                      <div className="winner-stats-mini">
                        <span>⭐ {winner.total_stars}</span>
                        <span>💰 {parseFloat(winner.total_brt_won).toFixed(2)}</span>
                      </div>
                      <div className="winner-meta">
                        <span>Week {winner.week_number}, {winner.year}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-gallery">
                <span className="empty-icon">🏆</span>
                <p>No winners yet</p>
                <p className="empty-subtitle">Be the first champion!</p>
              </div>
            )}
          </div>
          
          {/* Info Box */}
          <div className="gallery-info-box">
            <h4>ℹ️ How it works</h4>
            <ul>
              <li>🏆 Winners are displayed for <strong>365 days</strong></li>
              <li>📊 Rankings are based on <strong>total Stars received</strong></li>
              <li>🔄 Gallery updates <strong>automatically</strong> each week</li>
              <li>👑 Current week's winner is featured at the top</li>
              <li>📜 Past winners are sorted by week (newest first)</li>
            </ul>
          </div>
        </>
      )}
      
      {nominations.length === 0 && (
        <div className="empty-nominations">
          <span className="empty-icon">🎯</span>
          <p>No nominations available</p>
          <p className="empty-subtitle">Check back later!</p>
        </div>
      )}
    </div>
  );
};

export default StarsGallery;