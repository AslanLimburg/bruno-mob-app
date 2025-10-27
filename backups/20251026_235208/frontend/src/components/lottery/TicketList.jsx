// Ticket List Component
// Path: ~/bruno-token-app/frontend/src/components/Lottery/TicketList.jsx

import React, { useState } from 'react';
import lotteryService from '../../services/lotteryService';
import './Lottery.css';

const TicketList = ({ tickets, onRefresh }) => {
  const [filter, setFilter] = useState('all');
  
  if (!tickets || tickets.length === 0) {
    return (
      <div className="ticket-list-container">
        <h2>YOUR TICKETS</h2>
        <div className="empty-state">
          <p>No tickets yet. Buy your first ticket above!</p>
        </div>
      </div>
    );
  }
  
  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ticket.status === 'pending';
    if (filter === 'winner') return ticket.status === 'winner';
    if (filter === 'loser') return ticket.status === 'loser';
    return true;
  });
  
  return (
    <div className="ticket-list-container">
      <div className="ticket-list-header">
        <h2>YOUR TICKETS ({tickets.length})</h2>
        
        <div className="ticket-filters">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={filter === 'winner' ? 'active' : ''}
            onClick={() => setFilter('winner')}
          >
            Winners
          </button>
          <button 
            className={filter === 'loser' ? 'active' : ''}
            onClick={() => setFilter('loser')}
          >
            Lost
          </button>
        </div>
      </div>
      
      <div className="ticket-list">
        {filteredTickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
};

const TicketCard = ({ ticket }) => {
  const formatted = lotteryService.formatTicketNumbers(ticket);
  const drawDate = new Date(ticket.draw_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const getStatusIcon = () => {
    switch(ticket.status) {
      case 'pending': return '⏳';
      case 'winner': return '✅';
      case 'loser': return '❌';
      case 'cancelled': return '🚫';
      default: return '';
    }
  };
  
  const getStatusClass = () => {
    switch(ticket.status) {
      case 'winner': return 'status-winner';
      case 'loser': return 'status-loser';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };
  
  return (
    <div className={`ticket-card ${getStatusClass()}`}>
      <div className="ticket-header">
        <span className="ticket-id">Ticket #{ticket.id}</span>
        <span className="ticket-date">{drawDate}</span>
      </div>
      
      <div className="ticket-numbers">
        <div className="white-balls">
          {formatted.white.split('-').map((num, i) => (
            <span key={i} className="ball white">{num}</span>
          ))}
        </div>
        <div className="powerball-ball">
          <span className="ball powerball">{formatted.powerball}</span>
        </div>
      </div>
      
      {ticket.status !== 'pending' && (
        <div className="ticket-result">
          {ticket.status === 'winner' && (
            <>
              <div className="result-match">
                Matched: {ticket.matched_count} white 
                {ticket.matched_powerball && ' + PB'}
              </div>
              <div className="result-prize">
                WON: {ticket.prize_brt} BRUNO 💰
                {ticket.won_jackpot && <span className="jackpot-badge">JACKPOT!</span>}
              </div>
            </>
          )}
          
          {ticket.status === 'loser' && (
            <div className="result-match">
              Matched: {ticket.matched_count} white
              {ticket.matched_powerball && ' + PB'}
            </div>
          )}
          
          {ticket.status === 'cancelled' && (
            <div className="result-match">
              Cancelled: {ticket.cancelled_reason}
            </div>
          )}
        </div>
      )}
      
      <div className="ticket-status">
        {getStatusIcon()} {ticket.status.toUpperCase()}
      </div>
    </div>
  );
};

export default TicketList;