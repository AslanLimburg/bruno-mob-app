import React, { useState, useEffect } from 'react';
import DisputeResolution from './DisputeResolution';
import './Admin.css';

const ModeratorDashboard = () => {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    underReview: 0,
    resolved: 0,
    expired: 0
  });

  useEffect(() => {
    fetchAllDisputes();
  }, []);

  const fetchAllDisputes = async () => {
    console.log('[ModeratorDashboard] Starting fetchAllDisputes...');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[ModeratorDashboard] Token:', token ? 'exists' : 'missing');
      console.log('[ModeratorDashboard] API URL:', process.env.REACT_APP_API_URL);
      
      // Получаем все челленджи со спорами
      const response = await fetch(`${process.env.REACT_APP_API_URL}/challenge`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[ModeratorDashboard] Challenges response status:', response.status);

      if (!response.ok) throw new Error('Failed to fetch challenges');
      
      const data = await response.json();
      const challenges = data.data || [];
      console.log('[ModeratorDashboard] Fetched challenges:', challenges.length, challenges);

      // Собираем все споры из всех челленджей
      let allDisputes = [];
      for (const challenge of challenges) {
        try {
          console.log(`[ModeratorDashboard] Fetching disputes for challenge ${challenge.id}...`);
          const disputesResponse = await fetch(
            `${process.env.REACT_APP_API_URL}/challenge/${challenge.id}/disputes`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          console.log(`[ModeratorDashboard] Disputes response for challenge ${challenge.id}:`, disputesResponse.status);

          if (disputesResponse.ok) {
            const disputesData = await disputesResponse.json();
            console.log(`[ModeratorDashboard] Disputes data for challenge ${challenge.id}:`, disputesData);
            if (disputesData.success && disputesData.disputes) {
              allDisputes = [...allDisputes, ...disputesData.disputes.map(d => ({
                ...d,
                challenge_title: challenge.title
              }))];
            }
          }
        } catch (err) {
          console.error(`Error fetching disputes for challenge ${challenge.id}:`, err);
        }
      }

      console.log('[ModeratorDashboard] Total disputes collected:', allDisputes.length, allDisputes);
      setDisputes(allDisputes);
      calculateStats(allDisputes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setLoading(false);
    }
  };

  const calculateStats = (disputesList) => {
    const now = new Date();
    const stats = {
      total: disputesList.length,
      open: disputesList.filter(d => d.status === 'open').length,
      underReview: disputesList.filter(d => d.status === 'under_review').length,
      resolved: disputesList.filter(d => d.status === 'resolved').length,
      expired: disputesList.filter(d => {
        const deadline = new Date(d.deadline);
        return d.status !== 'resolved' && deadline < now;
      }).length
    };
    setStats(stats);
  };

  const handleViewDispute = (dispute) => {
    setSelectedDispute(dispute);
  };

  const handleBackToList = () => {
    setSelectedDispute(null);
    fetchAllDisputes();
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;

    if (diff < 0) return 'EXPIRED';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 24) {
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'open': { text: 'Open', color: '#ff6b35' },
      'under_review': { text: 'Under Review', color: '#ffa500' },
      'resolved': { text: 'Resolved', color: '#4caf50' }
    };
    const badge = badges[status] || { text: status, color: '#999' };
    return (
      <span className="status-badge" style={{ backgroundColor: badge.color }}>
        {badge.text}
      </span>
    );
  };

  const getSLAIndicator = (deadline, status) => {
    if (status === 'resolved') return null;

    const timeLeft = getTimeRemaining(deadline);
    const isExpired = timeLeft === 'EXPIRED';
    const isUrgent = !isExpired && timeLeft.includes('h') && parseInt(timeLeft) < 24;

    return (
      <span className={`sla-indicator ${isExpired ? 'expired' : isUrgent ? 'urgent' : 'normal'}`}>
        ⏰ {timeLeft}
      </span>
    );
  };

  if (selectedDispute) {
    return <DisputeResolution dispute={selectedDispute} onBack={handleBackToList} />;
  }

  return (
    <div className="moderator-dashboard">
      <div className="dashboard-header">
        <h2>⚖️ Moderator Dashboard</h2>
        <button onClick={fetchAllDisputes} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Disputes</div>
        </div>
        <div className="stat-card open">
          <div className="stat-value">{stats.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card review">
          <div className="stat-value">{stats.underReview}</div>
          <div className="stat-label">Under Review</div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-value">{stats.resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card expired">
          <div className="stat-value">{stats.expired}</div>
          <div className="stat-label">⚠️ Expired SLA</div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="disputes-section">
        <h3>Active Disputes</h3>

        {loading ? (
          <div className="loading">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="no-disputes">
            <p>✅ No disputes found. All challenges are running smoothly!</p>
          </div>
        ) : (
          <div className="disputes-list">
            {disputes.map(dispute => (
              <div 
                key={dispute.id} 
                className={`dispute-card ${dispute.status}`}
                onClick={() => handleViewDispute(dispute)}
              >
                <div className="dispute-header">
                  <h4>{dispute.challenge_title || `Challenge #${dispute.challenge_id}`}</h4>
                  {getStatusBadge(dispute.status)}
                </div>

                <div className="dispute-info">
                  <div className="info-row">
                    <span className="label">Dispute ID:</span>
                    <span className="value">#{dispute.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">User:</span>
                    <span className="value">{dispute.user_email || `User #${dispute.user_id}`}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Reason:</span>
                    <span className="value reason">{dispute.reason}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Created:</span>
                    <span className="value">
                      {new Date(dispute.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">SLA:</span>
                    <span className="value">
                      {getSLAIndicator(dispute.deadline, dispute.status)}
                    </span>
                  </div>
                </div>

                <div className="dispute-actions">
                  <button className="view-btn">
                    👁️ View & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorDashboard;
