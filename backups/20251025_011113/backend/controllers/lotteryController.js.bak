const { query, transaction } = require('../config/database');
const lotteryAPI = require('../services/lotteryAPI');
const lotteryPayout = require('../services/lotteryPayout');

const getCurrentDraw = async (req, res) => {
  try {
    const draw = await lotteryAPI.getCurrentDraw();
    const jackpot = await lotteryPayout.getJackpot();
    
    const prizePool = parseFloat(draw.current_prize_pool || 0);
    const jackpotAmount = parseFloat(jackpot.total_amount);
    
    const potentialPrizes = {
      '6': (prizePool * 0.40) + jackpotAmount,
      '5': prizePool * 0.25,
      '4pb': prizePool * 0.20,
      '4': prizePool * 0.10,
      '3pb': prizePool * 0.04,
      '3': 1
    };
    
    const now = new Date();
    const drawDate = new Date(draw.draw_date);
    const timeRemaining = Math.max(0, Math.floor((drawDate - now) / 1000));
    
    res.json({
      draw_date: draw.draw_date,
      current_prize_pool: prizePool,
      jackpot: jackpotAmount,
      total_tickets: draw.total_tickets || 0,
      potential_prizes: potentialPrizes,
      time_remaining: timeRemaining,
      status: draw.status
    });
    
  } catch (error) {
    console.error('Error getting current draw:', error);
    res.status(500).json({ error: 'Failed to get current draw' });
  }
};

const buyTicket = async (req, res) => {
  try {
    const { white, powerball, draw_count = 1 } = req.body;
    const userId = req.userId;
    
    // Validation
    if (!white || white.length !== 5 || !powerball) {
      return res.status(400).json({ error: 'Invalid ticket numbers' });
    }
    
    for (let num of white) {
      if (num < 1 || num > 69) {
        return res.status(400).json({ error: 'White balls must be 1-69' });
      }
    }
    
    if (powerball < 1 || powerball > 26) {
      return res.status(400).json({ error: 'Powerball must be 1-26' });
    }
    
    const uniqueWhite = new Set(white);
    if (uniqueWhite.size !== 5) {
      return res.status(400).json({ error: 'White balls must be unique' });
    }
    
    const ticketCost = 2 * draw_count;
    
    const result = await transaction(async (client) => {
      // Check balance in user_balances table
      const balanceResult = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = 'BRT'`,
        [userId]
      );
      
      if (balanceResult.rows.length === 0) {
        throw new Error('User BRT balance not found');
      }
      
      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      
      if (currentBalance < ticketCost) {
        throw new Error('Insufficient balance');
      }
      
      // Deduct BRT from user_balances
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [ticketCost, userId]
      );
      
      // Get current draw
      const draw = await lotteryAPI.getCurrentDraw();
      const drawDate = new Date(draw.draw_date);
      
      // Distribution: 60% prize pool, 20% platform, 20% jackpot
      const toPrizePool = ticketCost * 0.60;
      const toPlatform = ticketCost * 0.20;
      const toJackpot = ticketCost * 0.20;
      
      // Update prize pool
      await client.query(
        `UPDATE lottery_draws 
         SET current_prize_pool = current_prize_pool + $1,
             platform_balance = platform_balance + $2,
             jackpot_contribution = jackpot_contribution + $3,
             total_tickets = total_tickets + $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE draw_date = $5`,
        [toPrizePool, toPlatform, toJackpot, draw_count, drawDate]
      );
      
      // Add to jackpot
      await client.query(
        `UPDATE lottery_jackpot 
         SET total_amount = total_amount + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [toJackpot]
      );
      
      // Add platform fee to admin (user_id = 1)
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [toPlatform]
      );
      
      // Create tickets
      const tickets = [];
      
      for (let i = 0; i < draw_count; i++) {
        const ticketResult = await client.query(
          `INSERT INTO lottery_tickets 
           (user_id, draw_date, white_ball_1, white_ball_2, white_ball_3, 
            white_ball_4, white_ball_5, powerball, ticket_cost, draw_count, remaining_draws)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 2, $9, $10)
           RETURNING id`,
          [userId, drawDate, white[0], white[1], white[2], white[3], white[4], 
           powerball, draw_count, draw_count]
        );
        
        tickets.push({
          id: ticketResult.rows[0].id,
          white_ball_1: white[0],
          white_ball_2: white[1],
          white_ball_3: white[2],
          white_ball_4: white[3],
          white_ball_5: white[4],
          powerball: powerball
        });
      }
      
      // Record transaction
      await client.query(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, crypto, amount, type, status)
         VALUES ($1, 1, 'BRT', $2, 'lottery_ticket_purchase', 'completed')`,
        [userId, ticketCost]
      );
      
      return {
        tickets,
        newBalance: currentBalance - ticketCost
      };
    });
    
    res.json({
      success: true,
      tickets: result.tickets,
      new_balance: result.newBalance,
      message: `Successfully purchased ${draw_count} ticket(s)`
    });
    
  } catch (error) {
    console.error('Error buying ticket:', error);
    
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    res.status(500).json({ error: 'Failed to buy ticket' });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const userId = req.userId;
    const { status = 'all', limit = 50 } = req.query;
    
    let queryText = `
      SELECT t.*, d.draw_date, d.status as draw_status,
             d.white_ball_1 as winning_1, d.white_ball_2 as winning_2,
             d.white_ball_3 as winning_3, d.white_ball_4 as winning_4,
             d.white_ball_5 as winning_5, d.powerball as winning_pb
      FROM lottery_tickets t
      LEFT JOIN lottery_draws d ON t.draw_date = d.draw_date
      WHERE t.user_id = $1
    `;
    
    const params = [userId];
    
    if (status !== 'all') {
      queryText += ` AND t.status = $2`;
      params.push(status);
      queryText += ` ORDER BY t.created_at DESC LIMIT $3`;
      params.push(parseInt(limit));
    } else {
      queryText += ` ORDER BY t.created_at DESC LIMIT $2`;
      params.push(parseInt(limit));
    }
    
    const result = await query(queryText, params);
    
    res.json({
      tickets: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error getting tickets:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
};

const getDrawHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(
      `SELECT * FROM lottery_draws 
       WHERE status IN ('checked', 'paid_out')
       ORDER BY draw_date DESC 
       LIMIT $1`,
      [parseInt(limit)]
    );
    
    res.json({
      draws: result.rows
    });
    
  } catch (error) {
    console.error('Error getting draw history:', error);
    res.status(500).json({ error: 'Failed to get draw history' });
  }
};

const getJackpot = async (req, res) => {
  try {
    const jackpot = await lotteryPayout.getJackpot();
    res.json(jackpot);
  } catch (error) {
    console.error('Error getting jackpot:', error);
    res.status(500).json({ error: 'Failed to get jackpot' });
  }
};

const quickPick = async (req, res) => {
  try {
    const white = [];
    while (white.length < 5) {
      const num = Math.floor(Math.random() * 69) + 1;
      if (!white.includes(num)) {
        white.push(num);
      }
    }
    white.sort((a, b) => a - b);
    
    const powerball = Math.floor(Math.random() * 26) + 1;
    
    res.json({ white, powerball });
  } catch (error) {
    console.error('Error generating quick pick:', error);
    res.status(500).json({ error: 'Failed to generate quick pick' });
  }
};

module.exports = {
  getCurrentDraw,
  buyTicket,
  getMyTickets,
  getDrawHistory,
  getJackpot,
  quickPick
};