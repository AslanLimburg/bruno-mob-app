// Current Pool Component
// Path: ~/bruno-token-app/frontend/src/components/Lottery/CurrentPool.jsx

import React, { useState, useEffect } from 'react';
import lotteryService from '../../services/lotteryService';
import './Lottery.css';

const CurrentPool = ({ currentDraw }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  
  useEffect(() => {
    if (!currentDraw) return;
    
    const updateTimer = () => {
      const formatted = lotteryService.formatTimeRemaining(currentDraw.time_remaining);
      setTimeRemaining(formatted);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [currentDraw]);
  
  if (!currentDraw) return null;
  
  const drawDate = new Date(currentDraw.draw_date);
  const formattedDate = drawDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="current-pool">
      <div className="draw-info">
        <h2>Next Draw</h2>
        <div className="draw-date">{formattedDate}</div>
        <div className="countdown">{timeRemaining}</div>
      </div>
      
      <div className="pool-stats">
        <div className="stat-card jackpot">
          <div className="stat-label">💎 JACKPOT</div>
          <div className="stat-value">{currentDraw.jackpot.toFixed(2)} BRT</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Current Prize Pool</div>
          <div className="stat-value">{currentDraw.current_prize_pool.toFixed(2)} BRT</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Tickets</div>
          <div className="stat-value">{currentDraw.total_tickets}</div>
        </div>
      </div>
    </div>
  );
};

export default CurrentPool;