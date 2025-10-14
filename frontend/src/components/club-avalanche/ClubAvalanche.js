import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ClubAvalanche.css';
import { QRCodeCanvas } from 'qrcode.react';

const PROGRAMS = {
  'GS-I': { name: 'Golden Stairs I', price: 5, levels: 4, perLevel: 0.88 },
  'GS-II': { name: 'Golden Stairs II', price: 50, levels: 5, perLevel: 4.98 },
  'GS-III': { name: 'Golden Stairs III', price: 500, levels: 7, perLevel: 35.69 },
  'GS-IV': { name: 'Golden Stairs IV', price: 1000, levels: 8, perLevel: 62.48 }
};

const ClubAvalanche = () => {
  const { user } = useAuth();
  const [myPrograms, setMyPrograms] = useState([]);
  const [stats, setStats] = useState({ totalReferrals: 0, totalEarned: 0 });
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [programsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/club-avalanche/my-programs', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/club-avalanche/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const programsData = await programsRes.json();
      const statsData = await statsRes.json();

      setMyPrograms(programsData.data || []);
      setStats(statsData.data || { totalReferrals: 0, totalEarned: 0 });
      setLoading(false);
    } catch (error) {
      console.error('Load data error:', error);
      setLoading(false);
    }
  };

  const handleProgramClick = (programKey) => {
    const owned = myPrograms.find(p => p.program === programKey);
    setSelectedProgram(programKey);
    
    if (owned) {
      setShowModal(true);
    } else {
      setShowModal(true);
    }
  };

  const handleJoinProgram = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/club-avalanche/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          program: selectedProgram,
          referralCode: referralCode || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully joined ${selectedProgram}! Your code: ${data.data.referralCode}`);
        setShowModal(false);
        setReferralCode('');
        loadData();
      } else {
        alert(data.error || 'Failed to join program');
      }
    } catch (error) {
      console.error('Join error:', error);
      alert('Error joining program');
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  const ownedProgram = myPrograms.find(p => p.program === selectedProgram);
  const programConfig = PROGRAMS[selectedProgram];

  if (loading) {
    return <div className="club-loading">Loading Club Avalanche...</div>;
  }

  return (
    <div className="club-avalanche-container">
      <h1 className="club-title">🏔️ CLUB AVALANCHE</h1>
      <p className="club-subtitle">Golden Stairs Referral Programs</p>

      {/* Stats Cards */}
      <div className="club-stats-grid">
        <div className="club-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalReferrals}</div>
          <div className="stat-label">Total Referrals</div>
        </div>

        <div className="club-stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{stats.totalEarned.toFixed(2)} BRT</div>
          <div className="stat-label">Total Earned</div>
        </div>

        <div className="club-stat-card" onClick={() => setActiveTab('tree')}>
          <div className="stat-icon">🌳</div>
          <div className="stat-value">View Tree</div>
          <div className="stat-label">Referral Tree</div>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="club-programs-grid">
        {Object.keys(PROGRAMS).map(key => {
          const program = PROGRAMS[key];
          const owned = myPrograms.find(p => p.program === key);

          return (
            <div 
              key={key} 
              className={`club-program-card ${owned ? 'owned' : ''}`}
              onClick={() => handleProgramClick(key)}
            >
              <div className="program-header">
                <h3>{program.name}</h3>
                {owned && <span className="owned-badge">✓ ACTIVE</span>}
              </div>
              <div className="program-price">{program.price} BRT</div>
              <div className="program-details">
                <div className="detail-row">
                  <span>Levels:</span>
                  <span>{program.levels}</span>
                </div>
                <div className="detail-row">
                  <span>Per Level:</span>
                  <span>{program.perLevel} BRT</span>
                </div>
              </div>
              <button className="program-btn">
                {owned ? 'View Code' : 'Join Program'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="club-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="club-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            
            <h2>{programConfig.name}</h2>

            {ownedProgram ? (
              <>
                <div className="modal-section">
                  <h3>Your Referral Code</h3>
                  <div className="code-display">
                    <code>{ownedProgram.referral_code}</code>
                    <button onClick={() => copyToClipboard(ownedProgram.referral_code, 'Code')}>
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Share Via</h3>
                  <div className="share-buttons">
                    <button onClick={() => alert('WhatsApp sharing - coming soon')}>
                      WhatsApp
                    </button>
                    <button onClick={() => alert('Telegram sharing - coming soon')}>
                      Telegram
                    </button>
                    <button onClick={() => alert('Bruno Messenger - coming soon')}>
                      Bruno Messenger
                    </button>
                  </div>
                </div>

		<div className="modal-section">
 		 <h3>QR Code</h3>
 		 <div className="qr-container">
    		<QRCodeCanvas 
     		 value={`https://brunotoken.com/ref/${ownedProgram.referral_code}?program=${selectedProgram}`}
    		  size={200}
    		  level="H"
  		  />
 		 </div>
 		 <button onClick={() => alert('QR download - coming soon')} className="download-qr-btn">
  		  Download QR
		  </button>
		</div> 
	             </>
        	    ) : (
              <>
                <div className="modal-section">
                  <h3>Enter Referral Code (Optional)</h3>
                  <input
                    type="text"
                    placeholder="BRK-ABC123-GS1"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="referral-input"
                  />
                </div>

                <div className="modal-section">
                  <h3>Program Details</h3>
                  <div className="program-info">
                    <p>Price: <strong>{programConfig.price} BRT</strong></p>
                    <p>Levels: <strong>{programConfig.levels}</strong></p>
                    <p>Per Level: <strong>{programConfig.perLevel} BRT</strong></p>
                  </div>
                </div>

                <button className="join-btn" onClick={handleJoinProgram}>
                  Join for {programConfig.price} BRT
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubAvalanche;
