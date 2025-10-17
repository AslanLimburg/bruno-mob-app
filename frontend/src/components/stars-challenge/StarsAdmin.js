// =====================================================
// BRT STARS CHALLENGE - ADMIN PANEL
// frontend/src/components/stars-challenge/StarsAdmin.js
// =====================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const StarsAdmin = ({ user }) => {
  const [activeTab, setActiveTab] = useState('nominations');
  const [nominations, setNominations] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Nomination form
  const [nomTitle, setNomTitle] = useState('');
  const [nomDesc, setNomDesc] = useState('');
  
  // Challenge form
  const [selectedNomination, setSelectedNomination] = useState('');
  const [chalTitle, setChalTitle] = useState('');
  const [chalDesc, setChalDesc] = useState('');
  const [minStake, setMinStake] = useState(1);
  const [maxStake, setMaxStake] = useState(50);
  const [duration, setDuration] = useState(7); // days
  
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (activeTab === 'nominations' || activeTab === 'challenges') {
        const nomRes = await axios.get(`${API_URL}/stars/gallery/nominations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNominations(nomRes.data.nominations || []);
      }
      
      if (activeTab === 'challenges' || activeTab === 'manage') {
        const chalRes = await axios.get(`${API_URL}/stars/challenge/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChallenges(chalRes.data.challenges || []);
      }
    } catch (err) {
      console.error('Load data error:', err);
    }
  };
  
  const createNomination = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/stars/gallery/nomination/create`, {
        title: nomTitle,
        description: nomDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Nomination created successfully!');
      setNomTitle('');
      setNomDesc('');
      loadData();
    } catch (err) {
      setMessage('❌ Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const createChallenge = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
try {
  const token = localStorage.getItem('token');
  
  // Вычислить end_date из duration
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(duration));
  
  await axios.post(`${API_URL}/stars/challenge/create`, {
    nominationId: parseInt(selectedNomination),
    title: chalTitle,
    description: chalDesc,
    adminWallet: user.email,  // Email Stars Admin
    minStake: parseFloat(minStake),
    maxStake: parseFloat(maxStake),
    endDate: endDate.toISOString()
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  setMessage('✅ Challenge created successfully!');
  setChalTitle('');
  setChalDesc('');
  setSelectedNomination('');
  loadData();
} catch (err) {
  setMessage('❌ Error: ' + (err.response?.data?.error || err.message));
} finally {
  setLoading(false);
}
  };
  
  const closeChallenge = async (challengeId) => {
    if (!window.confirm('Close this challenge and distribute rewards?')) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/stars/challenge/${challengeId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Challenge closed successfully! Rewards distributed.');
      loadData();
    } catch (err) {
      setMessage('❌ Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="stars-admin-container">
      <div className="admin-header">
        <h2>🛠️ Stars Challenge Admin Panel</h2>
        <p className="admin-subtitle">Manage nominations, challenges, and system</p>
      </div>
      
      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'nominations' ? 'active' : ''}
          onClick={() => setActiveTab('nominations')}
        >
          🎯 Create Nomination
        </button>
        <button 
          className={activeTab === 'challenges' ? 'active' : ''}
          onClick={() => setActiveTab('challenges')}
        >
          🏆 Create Challenge
        </button>
        <button 
          className={activeTab === 'manage' ? 'active' : ''}
          onClick={() => setActiveTab('manage')}
        >
          📊 Manage Challenges
        </button>
      </div>
      
      {/* Message */}
      {message && (
        <div className={`admin-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      
      {/* Content */}
      <div className="admin-content">
        {/* CREATE NOMINATION */}
        {activeTab === 'nominations' && (
          <div className="admin-section">
            <h3>Create New Nomination</h3>
            <p className="section-desc">Nominations are used for weekly gallery categories</p>
            
            <form onSubmit={createNomination} className="admin-form">
              <div className="form-group">
                <label>Nomination Title *</label>
                <input
                  type="text"
                  value={nomTitle}
                  onChange={(e) => setNomTitle(e.target.value)}
                  placeholder="e.g., Best Photo of the Week"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={nomDesc}
                  onChange={(e) => setNomDesc(e.target.value)}
                  placeholder="Describe this nomination category..."
                  rows="3"
                />
              </div>
              
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '⏳ Creating...' : '✅ Create Nomination'}
              </button>
            </form>
            
            {/* Existing Nominations */}
            <div className="existing-items">
              <h4>Existing Nominations ({nominations.length})</h4>
              <div className="items-grid">
                {nominations.map(nom => (
                  <div key={nom.id} className="item-card">
                    <h5>{nom.title}</h5>
                    <p>{nom.description}</p>
                    <span className={`badge ${nom.is_active ? 'active' : 'inactive'}`}>
                      {nom.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* CREATE CHALLENGE */}
        {activeTab === 'challenges' && (
          <div className="admin-section">
            <h3>Create New Challenge</h3>
            <p className="section-desc">Challenges are contests where users compete with photos</p>
            
            <form onSubmit={createChallenge} className="admin-form">
              <div className="form-group">
                <label>Select Nomination *</label>
                <select
                  value={selectedNomination}
                  onChange={(e) => setSelectedNomination(e.target.value)}
                  required
                >
                  <option value="">-- Choose nomination --</option>
                  {nominations.filter(n => n.is_active).map(nom => (
                    <option key={nom.id} value={nom.id}>{nom.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Challenge Title *</label>
                <input
                  type="text"
                  value={chalTitle}
                  onChange={(e) => setChalTitle(e.target.value)}
                  placeholder="e.g., Photo Contest #1"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={chalDesc}
                  onChange={(e) => setChalDesc(e.target.value)}
                  placeholder="Describe this challenge..."
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Min Stake (BRT)</label>
                  <input
                    type="number"
                    value={minStake}
                    onChange={(e) => setMinStake(e.target.value)}
                    min="0.1"
                    step="0.1"
                  />
                </div>
                
                <div className="form-group">
                  <label>Max Stake (BRT)</label>
                  <input
                    type="number"
                    value={maxStake}
                    onChange={(e) => setMaxStake(e.target.value)}
                    min="1"
                    step="1"
                  />
                </div>
                
                <div className="form-group">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    max="30"
                  />
                </div>
              </div>
              
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '⏳ Creating...' : '🏆 Create Challenge'}
              </button>
            </form>
          </div>
        )}
        
        {/* MANAGE CHALLENGES */}
        {activeTab === 'manage' && (
          <div className="admin-section">
            <h3>Active Challenges ({challenges.length})</h3>
            <p className="section-desc">Manage and close challenges</p>
            
            <div className="challenges-list">
              {challenges.length === 0 ? (
                <div className="empty-state">
                  <p>No active challenges. Create one in the "Create Challenge" tab!</p>
                </div>
              ) : (
                challenges.map(chal => (
                  <div key={chal.id} className="challenge-card">
                    <div className="challenge-header">
                      <h4>{chal.title}</h4>
                      <span className={`status ${chal.status}`}>{chal.status}</span>
                    </div>
                    
                    <p>{chal.description}</p>
                    
                    <div className="challenge-stats">
                      <div className="stat">
                        <span className="label">Prize Pool:</span>
                        <span className="value">{parseFloat(chal.total_pool || 0).toFixed(2)} BRT</span>
                      </div>
                      <div className="stat">
                        <span className="label">Participants:</span>
                        <span className="value">{chal.participants_count || 0}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Ends:</span>
                        <span className="value">{new Date(chal.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="challenge-actions">
                      <button 
                        onClick={() => window.open(`/challenge/${chal.id}`, '_blank')}
                        className="btn-secondary"
                      >
                        👁️ View Details
                      </button>
                      
                      {chal.status === 'active' && (
                        <button 
                          onClick={() => closeChallenge(chal.id)}
                          className="btn-danger"
                          disabled={loading}
                        >
                          🏁 Close & Distribute
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StarsAdmin;
