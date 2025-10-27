import React, { useState } from 'react';
import './Calculator.css';

const PROGRAMS = {
  'GS-I': { name: 'Golden Stairs I', price: 5, levels: 4, perLevel: 0.88 },
  'GS-II': { name: 'Golden Stairs II', price: 50, levels: 5, perLevel: 4.98 },
  'GS-III': { name: 'Golden Stairs III', price: 500, levels: 7, perLevel: 35.69 },
  'GS-IV': { name: 'Golden Stairs IV', price: 1000, levels: 8, perLevel: 62.48 }
};

const Calculator = ({ onClose }) => {
  const [selectedProgram, setSelectedProgram] = useState('GS-II');
  const [referralsPerLevel, setReferralsPerLevel] = useState(5);

  const calculateEarnings = () => {
    const program = PROGRAMS[selectedProgram];
    const levels = [];
    let total = 0;

    for (let level = 1; level <= program.levels; level++) {
      const referralsAtLevel = Math.pow(referralsPerLevel, level);
      const earnings = referralsAtLevel * program.perLevel;
      total += earnings;

      levels.push({
        level,
        referrals: referralsAtLevel,
        earnings: earnings.toFixed(2)
      });
    }

    return { levels, total: total.toFixed(2) };
  };

  const result = calculateEarnings();

  return (
    <div className="calculator-overlay" onClick={onClose}>
      <div className="calculator-modal" onClick={(e) => e.stopPropagation()}>
        <button className="calculator-close" onClick={onClose}>✕</button>
        
        <h2>🧮 Earnings Calculator</h2>
        <p className="calculator-subtitle">Calculate your potential referral earnings</p>

        {/* Program Selector */}
        <div className="calc-section">
          <label>Select Program:</label>
          <div className="program-selector">
            {Object.keys(PROGRAMS).map(key => (
              <button
                key={key}
                className={`program-select-btn ${selectedProgram === key ? 'active' : ''}`}
                onClick={() => setSelectedProgram(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Referrals Input */}
        <div className="calc-section">
          <label>Expected referrals per person:</label>
          <div className="referral-input-group">
            <button 
              className="adjust-btn" 
              onClick={() => setReferralsPerLevel(Math.max(1, referralsPerLevel - 1))}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="20"
              value={referralsPerLevel}
              onChange={(e) => setReferralsPerLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="referral-input"
            />
            <button 
              className="adjust-btn" 
              onClick={() => setReferralsPerLevel(Math.min(20, referralsPerLevel + 1))}
            >
              +
            </button>
          </div>
          <small>Each person brings {referralsPerLevel} new members</small>
        </div>

        {/* Results */}
        <div className="calc-results">
          <h3>Projected Earnings: {PROGRAMS[selectedProgram].name}</h3>
          
          <div className="levels-breakdown">
            {result.levels.map((level) => (
              <div key={level.level} className="level-row">
                <div className="level-info">
                  <span className="level-num">Level {level.level}</span>
                  <span className="level-refs">{level.referrals.toLocaleString()} referrals</span>
                </div>
                <div className="level-earning">
                  {level.earnings} BRT
                </div>
              </div>
            ))}
          </div>

          <div className="total-earning">
            <span>TOTAL POTENTIAL</span>
            <span className="total-amount">{parseFloat(result.total).toLocaleString()} BRT</span>
          </div>

          <div className="calc-disclaimer">
            <small>⚠️ This is a hypothetical calculation based on your input. Actual earnings depend on real referral activity.</small>
          </div>
        </div>

        <button className="calc-action-btn" onClick={onClose}>
          Got it! Start Referring
        </button>
      </div>
    </div>
  );
};

export default Calculator;
