// =====================================================
// BRT STARS CHALLENGE - CHALLENGE LIST COMPONENT
// frontend/src/components/stars-challenge/StarsChallengeList.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const StarsChallengeList = ({ user }) => {
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [starsAmount, setStarsAmount] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    loadActiveChallenges();
    loadUserPhotos();
  }, []);
  
  useEffect(() => {
    if (selectedChallenge) {
      loadChallengeLeaderboard(selectedChallenge.id);
    }
  }, [selectedChallenge]);
  
  const loadActiveChallenges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/challenge/active`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setChallenges(response.data.challenges || []);
      setLoading(false);
    } catch (err) {
      console.error('Load challenges error:', err);
      setLoading(false);
    }
  };
  
  const loadChallengeLeaderboard = async (challengeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/challenge/${challengeId}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setLeaderboard(response.data.leaderboard || []);
    } catch (err) {
      console.error('Load leaderboard error:', err);
    }
  };
  
  const loadUserPhotos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/stars/photo/user/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Только approved фото
      const approvedPhotos = (response.data.photos || []).filter(
        p => p.moderation_status === 'approved' && p.status === 'active'
      );
      setUserPhotos(approvedPhotos);
    } catch (err) {
      console.error('Load user photos error:', err);
    }
  };
  
  const handleSubmitPhoto = async () => {
    if (!selectedPhoto) {
      setMessage('Please select a photo');
      return;
    }
    
    if (!window.confirm('Submit this photo to challenge? (Cost: 1 BRT)')) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/stars/challenge/${selectedChallenge.id}/submit`,
        { photoId: selectedPhoto },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setMessage(response.data.message);
      setSelectedPhoto('');
      
      // Обновить leaderboard
      loadChallengeLeaderboard(selectedChallenge.id);
      
    } catch (err) {
      console.error('Submit photo error:', err);
      setMessage(err.response?.data?.error || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleVote = async (participantId) => {
    if (starsAmount < 1 || starsAmount > 50) {
      setMessage('Stars amount must be between 1 and 50');
      return;
    }
    
    if (!window.confirm(`Vote with ${starsAmount} Stars? (Cost: ${starsAmount} BRT)`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/stars/challenge/${selectedChallenge.id}/vote`,
        { participantId, starsCount: starsAmount },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setMessage(response.data.message);
      setStarsAmount(1);
      
      // Обновить leaderboard
      loadChallengeLeaderboard(selectedChallenge.id);
      
    } catch (err) {
      console.error('Vote error:', err);
      setMessage(err.response?.data?.error || 'Vote failed');
    }
  };
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }
  
  if (selectedChallenge) {
    return (
      <div className="challenge-details">
        {/* Back Button */}
        <button 
          className="back-button"
          onClick={() => {
            setSelectedChallenge(null);
            setLeaderboard([]);
            setMessage('');
          }}
        >
          ← Back to Challenges
        </button>
        
        {/* Challenge Info */}
        <div className="challenge-header">
          <h2>{selectedChallenge.title}</h2>
          <p className="challenge-description">{selectedChallenge.description}</p>
          
          <div className="challenge-meta">
            <span className="meta-item">
              💰 Prize Pool: <strong>{parseFloat(selectedChallenge.total_pool || 0).toFixed(2)} BRT</strong>
            </span>
            <span className="meta-item">
              👥 Participants: <strong>{selectedChallenge.participants_count || 0}</strong>
            </span>
            <span className="meta-item">
              ⭐ Stake Range: <strong>{selectedChallenge.min_stake}-{selectedChallenge.max_stake} Stars</strong>
            </span>
            <span className="meta-item">
              📅 Ends: <strong>{new Date(selectedChallenge.end_date).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>
        
        {/* Submit Photo Section */}
        <div className="submit-photo-section">
          <h3>📤 Submit Your Photo (1 BRT)</h3>
          
          {userPhotos.length > 0 ? (
            <div className="photo-select-form">
              <select 
                value={selectedPhoto}
                onChange={(e) => setSelectedPhoto(e.target.value)}
                disabled={submitting}
              >
                <option value="">-- Select Photo --</option>
                {userPhotos.map(photo => (
                  <option key={photo.id} value={photo.id}>
                    Photo #{photo.id} (⭐ {photo.total_stars || 0} stars)
                  </option>
                ))}
              </select>
              
              <button 
                className="submit-button"
                onClick={handleSubmitPhoto}
                disabled={!selectedPhoto || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Photo (1 BRT)'}
              </button>
            </div>
          ) : (
            <div className="no-photos-message">
              <p>You don't have any approved photos yet.</p>
              <button onClick={() => window.dispatchEvent(new CustomEvent('switchStarsTab', { detail: 'profile' }))}>
                Upload Photo
              </button>
            </div>
          )}
        </div>
        
        {/* Leaderboard */}
        <div className="leaderboard-section">
          <h3>🏆 Leaderboard</h3>
          
          {leaderboard.length > 0 ? (
            <div className="leaderboard-grid">
              {leaderboard.map((participant, index) => (
                <div key={participant.id} className={`participant-card rank-${index + 1}`}>
                  <div className="rank-badge">#{index + 1}</div>
                  
                  <div className="participant-photo">
                    <img src={participant.photo_url} alt={`Participant ${participant.id}`} />
                  </div>
                  
                  <div className="participant-info">
                    <h4>{participant.participant_name}</h4>
                    <div className="participant-stats">
                      <span>⭐ {participant.total_votes || 0} Stars</span>
                      <span>💰 {parseFloat(participant.total_brt_collected || 0).toFixed(2)} BRT</span>
                      <span>👥 {participant.unique_voters || 0} voters</span>
                    </div>
                  </div>
                  
                  {participant.participant_id !== user.id && (
                    <div className="vote-section">
                      <input 
                        type="number"
                        min={selectedChallenge.min_stake}
                        max={selectedChallenge.max_stake}
                        value={starsAmount}
                        onChange={(e) => setStarsAmount(parseInt(e.target.value) || 1)}
                        className="stars-input"
                      />
                      <button 
                        className="vote-button"
                        onClick={() => handleVote(participant.id)}
                      >
                        Vote ⭐
                      </button>
                    </div>
                  )}
                  
                  {participant.participant_id === user.id && (
                    <div className="your-entry-badge">
                      ✨ Your Entry
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-leaderboard">
              <span className="empty-icon">🏆</span>
              <p>No participants yet</p>
              <p className="empty-subtitle">Be the first to join!</p>
            </div>
          )}
        </div>
        
        {/* Message Display */}
        {message && (
          <div className={message.includes('success') ? 'success-message' : 'error-message'}>
            {message}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="challenges-list">
      <div className="challenges-header">
        <h2>🏆 Active Challenges</h2>
        <p className="challenges-subtitle">Compete for prizes and glory!</p>
      </div>
      
      {challenges.length > 0 ? (
        <div className="challenges-grid">
          {challenges.map(challenge => (
            <div key={challenge.id} className="challenge-card">
              <div className="challenge-card-header">
                <h3>{challenge.title}</h3>
                {challenge.nomination_title && (
                  <span className="nomination-badge">{challenge.nomination_title}</span>
                )}
              </div>
              
              <p className="challenge-card-description">{challenge.description}</p>
              
              <div className="challenge-card-stats">
                <div className="stat-row">
                  <span>💰 Prize Pool:</span>
                  <strong>{parseFloat(challenge.total_pool || 0).toFixed(2)} BRT</strong>
                </div>
                <div className="stat-row">
                  <span>👥 Participants:</span>
                  <strong>{challenge.participants_count || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>⭐ Total Votes:</span>
                  <strong>{challenge.total_votes || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>📅 Ends:</span>
                  <strong>{new Date(challenge.end_date).toLocaleDateString()}</strong>
                </div>
              </div>
              
              <button 
                className="view-challenge-button"
                onClick={() => setSelectedChallenge(challenge)}
              >
                View Challenge →
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-challenges">
          <span className="empty-icon">🏆</span>
          <p>No active challenges</p>
          <p className="empty-subtitle">Check back later for new challenges!</p>
        </div>
      )}
    </div>
  );
};

export default StarsChallengeList;