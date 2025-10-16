import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ClubAvalanche.css';
import { QRCodeCanvas } from 'qrcode.react';
import ReferralTree from './ReferralTree';
import Calculator from './Calculator';

const PROGRAMS = {
  'GS-I': { name: 'Golden Stairs I', price: 5, levels: 4, perLevel: 0.88 },
  'GS-II': { name: 'Golden Stairs II', price: 50, levels: 5, perLevel: 4.98 },
  'GS-III': { name: 'Golden Stairs III', price: 500, levels: 7, perLevel: 35.69 },
  'GS-IV': { name: 'Golden Stairs IV', price: 1000, levels: 8, perLevel: 62.48 }
};

// Get BASE_URL from environment or default to localhost
const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';

const ClubAvalanche = () => {
  const { user } = useAuth();
  const [myPrograms, setMyPrograms] = useState([]);
  const [stats, setStats] = useState({ totalReferrals: 0, totalEarned: 0 });
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
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
    navigator.clipboard.writeText(text)
      .then(() => alert(`${type} copied to clipboard!`))
      .catch(() => alert('Failed to copy'));
  };

  const shareWhatsApp = () => {
    const ownedProgram = myPrograms.find(p => p.program === selectedProgram);
    if (!ownedProgram) return;
    
    const message = `🎉 Join Bruno Token - Club Avalanche!\n\n💎 Use my referral code: ${ownedProgram.referral_code}\n🔗 Link: ${BASE_URL}/ref/${ownedProgram.referral_code}?program=${selectedProgram}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareTelegram = () => {
    const ownedProgram = myPrograms.find(p => p.program === selectedProgram);
    if (!ownedProgram) return;
    
    const message = `🎉 Join Bruno Token - Club Avalanche!\n\n💎 Use my referral code: ${ownedProgram.referral_code}\n🔗 Link: ${BASE_URL}/ref/${ownedProgram.referral_code}?program=${selectedProgram}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(BASE_URL + '/ref/' + ownedProgram.referral_code + '?program=' + selectedProgram)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareViaBrunoChat = () => {
    const ownedProgram = myPrograms.find(p => p.program === selectedProgram);
    if (!ownedProgram) return;
    
    const message = `🎉 Join Bruno Token - Club Avalanche!\n\n💎 Use my referral code: ${ownedProgram.referral_code}\n🔗 Link: ${BASE_URL}/ref/${ownedProgram.referral_code}?program=${selectedProgram}`;
    
    // Сохраняем сообщение для BrunoChat
    localStorage.setItem('brunoChat_shareMessage', message);
    
    // Переключаем вкладку на messenger через событие
    const event = new CustomEvent('switchToDashboardTab', { detail: 'messenger' });
    window.dispatchEvent(event);
    
    // Закрываем модальное окно
    setShowModal(false);
  };

  const copyQR = async () => {
    try {
      const canvas = document.querySelector('.qr-container canvas');
      if (!canvas) {
        alert('QR code not found');
        return;
      }
      
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          alert('QR code copied! Now you can paste it in WhatsApp/Telegram/BrunoChat (Ctrl+V or Cmd+V)');
        } catch (err) {
          console.error('Clipboard API failed:', err);
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `${ownedProgram.referral_code}_QR.png`;
          link.href = url;
          link.click();
          alert('Your browser doesn\'t support copying images. QR code downloaded instead!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Copy QR error:', error);
      alert('Failed to copy QR code');
    }
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

        <div className="club-stat-card" onClick={() => setShowTree(true)}>
          <div className="stat-icon">🌳</div>
          <div className="stat-value">View Tree</div>
          <div className="stat-label">Referral Tree</div>
        </div>

        <div className="club-stat-card" onClick={() => setShowCalculator(true)}>
          <div className="stat-icon">🧮</div>
          <div className="stat-value">Calculator</div>
          <div className="stat-label">Earnings Projector</div>
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
                    <button onClick={shareWhatsApp} className="share-btn-whatsapp">
                      📱 WhatsApp
                    </button>
                    <button onClick={shareTelegram} className="share-btn-telegram">
                      💬 Telegram
                    </button>
                    <button onClick={shareViaBrunoChat} className="share-btn-brunochat">
                      💬 BrunoChat
                    </button>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>QR Code</h3>
                  <div className="qr-container">
                    <QRCodeCanvas 
                      value={`${BASE_URL}/ref/${ownedProgram.referral_code}?program=${selectedProgram}`}
                      size={200}
                      level="H"
                    />
                  </div>
                  <button onClick={copyQR} className="download-qr-btn">
                    📋 Copy QR
                  </button>
                  <div className="referral-link-preview">
                    <small>{BASE_URL}/ref/{ownedProgram.referral_code}?program={selectedProgram}</small>
                  </div>
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

      {/* Referral Tree Modal */}
      {showTree && <ReferralTree onClose={() => setShowTree(false)} />}

      {/* Calculator Modal */}
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
};

export default ClubAvalanche;