// Frontend Lottery Service
// Path: ~/bruno-token-app/frontend/src/services/lotteryService.js

import api from './api';

const lotteryService = {
  
  async getCurrentDraw() {
    try {
      const response = await api.get('/lottery/current');
      return response.data;
    } catch (error) {
      console.error('Error getting current draw:', error);
      throw error;
    }
  },
  
  async getJackpot() {
    try {
      const response = await api.get('/lottery/jackpot');
      return response.data;
    } catch (error) {
      console.error('Error getting jackpot:', error);
      throw error;
    }
  },
  
  async buyTicket(numbers) {
    try {
      const response = await api.post('/lottery/buy', numbers);
      return response.data;
    } catch (error) {
      console.error('Error buying ticket:', error);
      throw error;
    }
  },
  
  async getMyTickets(status = 'all', limit = 50) {
    try {
      const response = await api.get('/lottery/my-tickets', {
        params: { status, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting my tickets:', error);
      throw error;
    }
  },
  
  async getDrawHistory(limit = 10) {
    try {
      const response = await api.get('/lottery/history', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting draw history:', error);
      throw error;
    }
  },
  
  async quickPick() {
    try {
      const response = await api.get('/lottery/quick-pick');
      return response.data;
    } catch (error) {
      console.error('Error generating quick pick:', error);
      throw error;
    }
  },
  
  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Draw in progress';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    
    return parts.join(' ');
  },
  
  formatTicketNumbers(ticket) {
    const white = [
      ticket.white_ball_1,
      ticket.white_ball_2,
      ticket.white_ball_3,
      ticket.white_ball_4,
      ticket.white_ball_5
    ].sort((a, b) => a - b);
    
    return {
      white: white.join('-'),
      powerball: ticket.powerball
    };
  }
};

export default lotteryService;