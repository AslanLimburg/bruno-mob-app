const { query, transaction } = require('../config/database');

class LotteryPayout {
  async getJackpot() {
    try {
      const result = await query(
        `SELECT * FROM lottery_jackpot WHERE id = 1`
      );

      return result.rows[0] || { total_amount: 100.00 };
    } catch (error) {
      console.error('Error getting jackpot:', error);
      throw error;
    }
  }

  async processPayouts(drawDate) {
    try {
      console.log(`💰 Processing payouts for draw: ${drawDate}`);
      
      return await transaction(async (client) => {
        // Get all winning tickets
        const winnersResult = await client.query(
          `SELECT * FROM lottery_tickets 
           WHERE draw_date = $1 AND status = 'winner' AND prize_amount > 0`,
          [drawDate]
        );

        const winners = winnersResult.rows;
        console.log(`🎉 Found ${winners.length} winning tickets`);

        let totalPaid = 0;
        let jackpotWon = false;

        for (const ticket of winners) {
          // Credit user balance in user_balances table
          await client.query(
            `UPDATE user_balances 
             SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND crypto = 'BRT'`,
            [ticket.prize_amount, ticket.user_id]
          );

          // Record payout
          await client.query(
            `INSERT INTO lottery_payouts 
             (ticket_id, user_id, draw_date, prize_category, prize_amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [ticket.id, ticket.user_id, ticket.draw_date, ticket.prize_category, ticket.prize_amount]
          );

          // Record transaction
          await client.query(
            `INSERT INTO transactions 
             (from_user_id, to_user_id, crypto, amount, type, status)
             VALUES (1, $1, 'BRT', $2, 'lottery_prize', 'completed')`,
            [ticket.user_id, ticket.prize_amount]
          );

          totalPaid += parseFloat(ticket.prize_amount);

          // Check if jackpot was won
          if (ticket.prize_category === '6') {
            jackpotWon = true;
            
            // Update jackpot record
            await client.query(
              `UPDATE lottery_jackpot 
               SET last_won_date = CURRENT_TIMESTAMP, 
                   last_won_amount = $1,
                   total_amount = 100.00,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = 1`,
              [ticket.prize_amount]
            );
            
            console.log(`🏆 JACKPOT WON! User ${ticket.user_id} won ${ticket.prize_amount} BRT`);
          }

          console.log(`✅ Paid ${ticket.prize_amount} BRT to user ${ticket.user_id}`);
        }

        // Update draw status
        await client.query(
          `UPDATE lottery_draws SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP WHERE draw_date = $1`,
          [drawDate]
        );

        console.log(`💵 Total paid out: ${totalPaid.toFixed(2)} BRT`);

        return {
          winnersCount: winners.length,
          totalPaid: totalPaid,
          jackpotWon: jackpotWon
        };
      });
    } catch (error) {
      console.error('Error processing payouts:', error);
      throw error;
    }
  }

  async updateJackpot(amount) {
    try {
      await query(
        `UPDATE lottery_jackpot 
         SET total_amount = total_amount + $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [amount]
      );

      console.log(`💰 Jackpot updated: +${amount} BRT`);
    } catch (error) {
      console.error('Error updating jackpot:', error);
      throw error;
    }
  }
}

module.exports = new LotteryPayout();