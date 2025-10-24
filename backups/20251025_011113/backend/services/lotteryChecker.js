const { query, transaction } = require('../config/database');

class LotteryChecker {
  async checkTickets(drawDate) {
    try {
      console.log(`🎫 Checking tickets for draw: ${drawDate}`);
      
      // Get draw results
      const drawResult = await query(
        `SELECT * FROM lottery_draws WHERE draw_date = $1 AND status = 'drawn'`,
        [drawDate]
      );

      if (drawResult.rows.length === 0) {
        throw new Error('Draw not found or not drawn yet');
      }

      const draw = drawResult.rows[0];
      const winningNumbers = [
        draw.white_ball_1,
        draw.white_ball_2,
        draw.white_ball_3,
        draw.white_ball_4,
        draw.white_ball_5
      ];
      const winningPowerball = draw.powerball;

      // Get all active tickets for this draw
      const ticketsResult = await query(
        `SELECT * FROM lottery_tickets 
         WHERE draw_date = $1 AND status = 'active'`,
        [drawDate]
      );

      const tickets = ticketsResult.rows;
      console.log(`📋 Found ${tickets.length} tickets to check`);

      let winners = 0;
      let totalPrizes = 0;

      for (const ticket of tickets) {
        const ticketNumbers = [
          ticket.white_ball_1,
          ticket.white_ball_2,
          ticket.white_ball_3,
          ticket.white_ball_4,
          ticket.white_ball_5
        ];

        const whiteMatches = ticketNumbers.filter(num => 
          winningNumbers.includes(num)
        ).length;

        const powerballMatch = ticket.powerball === winningPowerball;

        const prizeCategory = this.determinePrizeCategory(whiteMatches, powerballMatch);

        if (prizeCategory) {
          const prizeAmount = await this.calculatePrize(prizeCategory, parseFloat(draw.current_prize_pool));

          await query(
            `UPDATE lottery_tickets 
             SET status = 'winner', prize_category = $1, prize_amount = $2
             WHERE id = $3`,
            [prizeCategory, prizeAmount, ticket.id]
          );

          winners++;
          totalPrizes += prizeAmount;

          console.log(`🎉 Winner! Ticket #${ticket.id} won ${prizeAmount} BRT (${prizeCategory})`);
        } else {
          await query(
            `UPDATE lottery_tickets SET status = 'loser' WHERE id = $1`,
            [ticket.id]
          );
        }
      }

      // Update draw status
      await query(
        `UPDATE lottery_draws SET status = 'checked', updated_at = CURRENT_TIMESTAMP WHERE draw_date = $1`,
        [drawDate]
      );

      console.log(`✅ Ticket checking complete: ${winners} winners, ${totalPrizes.toFixed(2)} BRT in prizes`);

      return {
        totalTickets: tickets.length,
        winners: winners,
        totalPrizes: totalPrizes
      };
    } catch (error) {
      console.error('Error checking tickets:', error);
      throw error;
    }
  }

  determinePrizeCategory(whiteMatches, powerballMatch) {
    if (whiteMatches === 5 && powerballMatch) return '6';
    if (whiteMatches === 5 && !powerballMatch) return '5';
    if (whiteMatches === 4 && powerballMatch) return '4pb';
    if (whiteMatches === 4 && !powerballMatch) return '4';
    if (whiteMatches === 3 && powerballMatch) return '3pb';
    if (whiteMatches === 3 && !powerballMatch) return '3';
    return null;
  }

  async calculatePrize(category, prizePool) {
    try {
      const result = await query(
        `SELECT * FROM lottery_prize_distribution WHERE category = $1`,
        [category]
      );

      if (result.rows.length === 0) {
        throw new Error(`Prize distribution not found for category: ${category}`);
      }

      const prize = result.rows[0];

      if (prize.fixed_amount) {
        return parseFloat(prize.fixed_amount);
      }

      if (prize.pool_percentage) {
        const percentage = parseFloat(prize.pool_percentage) / 100;
        
        // For jackpot category, add jackpot amount
        if (category === '6') {
          const jackpotResult = await query(`SELECT total_amount FROM lottery_jackpot WHERE id = 1`);
          const jackpotAmount = parseFloat(jackpotResult.rows[0].total_amount);
          return (prizePool * percentage) + jackpotAmount;
        }
        
        return prizePool * percentage;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating prize:', error);
      return 0;
    }
  }
}

module.exports = new LotteryChecker();