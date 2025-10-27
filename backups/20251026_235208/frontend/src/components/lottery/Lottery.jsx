// Lottery Main Component
// Path: ~/bruno-token-app/frontend/src/components/Lottery/Lottery.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import lotteryService from '../../services/lotteryService';
import NumberPicker from './NumberPicker';
import PrizeTable from './PrizeTable';
import CurrentPool from './CurrentPool';
import TicketList from './TicketList';
import './Lottery.css';

const Lottery = () => {
  const { user } = useAuth();
  
  const [currentDraw, setCurrentDraw] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState({
    white: [],
    powerball: null
  });
  const [drawCount, setDrawCount] = useState(1);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const loadData = async () => {
    try {
      const [drawData, ticketsData] = await Promise.all([
        lotteryService.getCurrentDraw(),
        lotteryService.getMyTickets('all', 20)
      ]);
      
      setCurrentDraw(drawData);
      setMyTickets(ticketsData.tickets || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load lottery data');
      setLoading(false);
    }
  };
  
  const handleQuickPick = async () => {
    try {
      const numbers = await lotteryService.quickPick();
      setSelectedNumbers(numbers);
    } catch (err) {
      setError('Failed to generate quick pick');
    }
  };
  
  const handleClear = () => {
    setSelectedNumbers({ white: [], powerball: null });
  };
  
  const handleBuyTicket = async () => {
    if (selectedNumbers.white.length !== 5) {
      setError('Please select 5 white balls');
      return;
    }
    
    if (!selectedNumbers.powerball) {
      setError('Please select a Powerball');
      return;
    }
    
    const cost = 2 * drawCount;
    if (user.bruno_balance < cost) {
      setError(`Insufficient balance. Need ${cost} BRUNO`);
      return;
    }
    
    setPurchasing(true);
    setError(null);
    
    try {
      await lotteryService.buyTicket({
        ...selectedNumbers,
        draw_count: drawCount
      });
      
      setSuccess(`Successfully purchased ${drawCount} ticket(s)!`);
      await loadData();
      handleClear();
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to purchase ticket');
    } finally {
      setPurchasing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="lottery-container">
        <div className="loading">Loading lottery...</div>
      </div>
    );
  }
  
  return (
    <div className="lottery-container">
      <h1 className="lottery-title">🎰 POWERBALL LOTTERY</h1>
      
      {error && (
        <div className="lottery-alert error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {success && (
        <div className="lottery-alert success">
          {success}
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}
      
      <CurrentPool currentDraw={currentDraw} />
      <PrizeTable currentDraw={currentDraw} />
      
      <div className="lottery-section">
        <h2>SELECT YOUR NUMBERS</h2>
        
        <NumberPicker
          selectedNumbers={selectedNumbers}
          setSelectedNumbers={setSelectedNumbers}
        />
        
        <div className="lottery-actions">
          <button className="btn-secondary" onClick={handleQuickPick}>
            🎲 Quick Pick
          </button>
          <button className="btn-secondary" onClick={handleClear}>
            ✕ Clear
          </button>
        </div>
        
        <div className="multi-draw">
          <label>Number of Draws:</label>
          <select value={drawCount} onChange={(e) => setDrawCount(parseInt(e.target.value))}>
            <option value={1}>1 draw (2 BRUNO)</option>
            <option value={2}>2 draws (4 BRUNO)</option>
            <option value={3}>3 draws (6 BRUNO)</option>
            <option value={5}>5 draws (10 BRUNO)</option>
            <option value={10}>10 draws (20 BRUNO)</option>
          </select>
        </div>
        
        <div className="lottery-summary">
          <div className="summary-row">
            <span>Cost:</span>
            <span className="cost">{2 * drawCount} BRUNO</span>
          </div>
          <div className="summary-row">
            <span>Your Balance:</span>
            <span className="balance">{user.bruno_balance} BRUNO</span>
          </div>
        </div>
        
        <button 
          className="btn-primary buy-btn" 
          onClick={handleBuyTicket}
          disabled={purchasing || selectedNumbers.white.length !== 5 || !selectedNumbers.powerball}
        >
          {purchasing ? 'PURCHASING...' : `BUY TICKET (${2 * drawCount} BRUNO)`}
        </button>
      </div>
      
      <TicketList tickets={myTickets} onRefresh={loadData} />
    </div>
  );
};

export default Lottery;