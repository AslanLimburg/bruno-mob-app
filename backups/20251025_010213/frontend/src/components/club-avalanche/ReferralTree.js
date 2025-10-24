import React, { useState, useEffect } from 'react';
import './ReferralTree.css';

const PROGRAMS = ['GS-I', 'GS-II', 'GS-III', 'GS-IV'];

const ReferralTree = ({ onClose }) => {
  const [selectedProgram, setSelectedProgram] = useState('GS-I');
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTree(selectedProgram);
  }, [selectedProgram]);

  const loadTree = async (program) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/club-avalanche/tree/${program}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        setTreeData(data.data || []);
      } else {
        setError(data.error || 'Failed to load tree');
      }
    } catch (err) {
      console.error('Load tree error:', err);
      setError('Failed to load referral tree');
    } finally {
      setLoading(false);
    }
  };

  // Group by levels
  const groupedByLevel = treeData.reduce((acc, user) => {
    const level = user.level || 1;
    if (!acc[level]) acc[level] = [];
    acc[level].push(user);
    return acc;
  }, {});

  const maxLevel = Math.max(...Object.keys(groupedByLevel).map(Number), 0);

  return (
    <div className="tree-modal-overlay" onClick={onClose}>
      <div className="tree-modal" onClick={(e) => e.stopPropagation()}>
        <button className="tree-close" onClick={onClose}>✕</button>
        
        <h2>🌳 Referral Tree</h2>
        
        {/* Program Tabs */}
        <div className="tree-tabs">
          {PROGRAMS.map(program => (
            <button
              key={program}
              className={`tree-tab ${selectedProgram === program ? 'active' : ''}`}
              onClick={() => setSelectedProgram(program)}
            >
              {program}
            </button>
          ))}
        </div>

        {/* Tree Content */}
        <div className="tree-content">
          {loading && <div className="tree-loading">Loading tree...</div>}
          
          {error && <div className="tree-error">{error}</div>}
          
          {!loading && !error && treeData.length === 0 && (
            <div className="tree-empty">
              <p>No referrals yet for {selectedProgram}</p>
              <p>Share your referral code to build your tree! 🚀</p>
            </div>
          )}

          {!loading && !error && treeData.length > 0 && (
            <div className="tree-visualization">
              {/* Root (You) */}
              <div className="tree-level level-0">
                <div className="tree-node root-node">
                  <div className="node-icon">👑</div>
                  <div className="node-info">
                    <div className="node-name">You</div>
                    <div className="node-program">{selectedProgram}</div>
                  </div>
                </div>
              </div>

              {/* Levels */}
              {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => (
                <div key={level} className={`tree-level level-${level}`}>
                  <div className="level-header">Level {level}</div>
                  <div className="level-nodes">
                    {(groupedByLevel[level] || []).map((user, idx) => (
                      <div key={idx} className="tree-node">
                        <div className="node-icon">👤</div>
                        <div className="node-info">
                          <div className="node-name">{user.name || 'User'}</div>
                          <div className="node-code">{user.referral_code}</div>
                          <div className="node-date">
                            {new Date(user.purchase_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="tree-summary">
                <div className="summary-item">
                  <strong>Total Referrals:</strong> {treeData.length}
                </div>
                <div className="summary-item">
                  <strong>Max Level:</strong> {maxLevel}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralTree;
