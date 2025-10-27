// Prize Table Component
// Path: ~/bruno-token-app/frontend/src/components/Lottery/PrizeTable.jsx

import React from 'react';
import './Lottery.css';

const PrizeTable = ({ currentDraw }) => {
  if (!currentDraw || !currentDraw.potential_prizes) return null;
  
  const prizes = currentDraw.potential_prizes;
  
  return (
    <div className="prize-table-container">
      <h2>🏆 POTENTIAL WINNINGS</h2>
      
      <table className="prize-table">
        <thead>
          <tr>
            <th>Match</th>
            <th>Prize (BRT)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="jackpot-row">
            <td>
              <div className="match-desc">
                <span className="match-title">6 numbers</span>
                <span className="match-detail">(5 white + Powerball)</span>
              </div>
            </td>
            <td className="prize-amount jackpot">
              {prizes['6'].toFixed(2)} 💎
              <div className="prize-note">JACKPOT!</div>
            </td>
          </tr>
          
          <tr>
            <td>
              <div className="match-desc">
                <span className="match-title">5 numbers</span>
                <span className="match-detail">(5 white balls)</span>
              </div>
            </td>
            <td className="prize-amount">
              {prizes['5'].toFixed(2)}
            </td>
          </tr>
          
          <tr>
            <td>
              <div className="match-desc">
                <span className="match-title">4 + Powerball</span>
                <span className="match-detail">(4 white + Powerball)</span>
              </div>
            </td>
            <td className="prize-amount">
              {prizes['4pb'].toFixed(2)}
            </td>
          </tr>
          
          <tr>
            <td>
              <div className="match-desc">
                <span className="match-title">4 numbers</span>
                <span className="match-detail">(4 white balls)</span>
              </div>
            </td>
            <td className="prize-amount">
              {prizes['4'].toFixed(2)}
            </td>
          </tr>
          
          <tr>
            <td>
              <div className="match-desc">
                <span className="match-title">3 + Powerball</span>
                <span className="match-detail">(3 white + Powerball)</span>
              </div>
            </td>
            <td className="prize-amount">
              {prizes['3pb'].toFixed(2)}
            </td>
          </tr>
          
          <tr>
            <td>
              <div className="match-desc">
                <span className="match-title">3 numbers</span>
                <span className="match-detail">(3 white balls)</span>
              </div>
            </td>
            <td className="prize-amount">
              {prizes['3'].toFixed(2)}
              <div className="prize-note">Fixed</div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div className="prize-info">
        ⚠️ Prizes (except "3 white") are shared if multiple winners
      </div>
    </div>
  );
};

export default PrizeTable;