const { query, transaction } = require('../config/database');
const { sendLotteryWinEmail } = require('../services/emailService');

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
        let adminFees = 0;
        let jackpotWon = false;

        for (const ticket of winners) {
          // Get user info for email
          const userResult = await client.query(
            `SELECT id, name, email FROM users WHERE id = $1`,
            [ticket.user_id]
          );
          const user = userResult.rows[0];

          // Get lottery name
          const lotteryResult = await client.query(
            `SELECT name FROM lottery_draws WHERE draw_date = $1`,
            [ticket.draw_date]
          );
          const lotteryName = lotteryResult.rows[0]?.name || 'Lottery Draw';

          // ✅ Admin платит 80% от prize_amount (вычет 20% комиссии)
          const fullPrize = parseFloat(ticket.prize_amount);
          const adminFee = fullPrize * 0.20; // 20% комиссия остаётся у admin
          const actualPayout = fullPrize * 0.80; // 80% получает победитель
          
          // Вычесть полную сумму из admin
          await client.query(
            `UPDATE user_balances 
             SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = 1 AND crypto = 'BRT'`,
            [fullPrize]
          );

          // Вернуть 20% комиссии admin
          await client.query(
            `UPDATE user_balances 
             SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = 1 AND crypto = 'BRT'`,
            [adminFee]
          );

          // Выплатить 80% победителю
          await client.query(
            `UPDATE user_balances 
             SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND crypto = 'BRT'`,
            [actualPayout, ticket.user_id]
          );

          // Record payout (записываем фактическую выплату)
          await client.query(
            `INSERT INTO lottery_payouts 
             (ticket_id, user_id, draw_date, prize_category, prize_amount)
             VALUES ($1, $2, $3, $4, $5)`,
            [ticket.id, ticket.user_id, ticket.draw_date, ticket.prize_category, actualPayout]
          );

          // Record transaction (Admin → Winner)
          await client.query(
            `INSERT INTO transactions 
             (from_user_id, to_user_id, crypto, amount, type, status, metadata)
             VALUES (1, $1, 'BRT', $2, 'lottery_prize', 'completed', 
                     $3::jsonb)`,
            [ticket.user_id, actualPayout, JSON.stringify({
              full_prize: fullPrize,
              admin_fee: adminFee,
              payout: actualPayout
            })]
          );

          totalPaid += actualPayout;
          adminFees += adminFee;

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
              [actualPayout]
            );
            
            console.log(`🏆 JACKPOT WON! User ${ticket.user_id} won ${actualPayout} BRT (${fullPrize} BRT - 20% fee)`);
          }

          console.log(`✅ Paid ${actualPayout} BRT to user ${ticket.user_id} (full prize: ${fullPrize} BRT, admin fee: ${adminFee} BRT)`);

          // 📧 Send email notification
          try {
            if (user && user.email) {
              await sendLotteryWinEmail(
                user.email,
                user.name || 'Player',
                actualPayout.toFixed(2),
                lotteryName
              );
              console.log(`📧 Email sent to ${user.email}`);
            }
          } catch (emailError) {
            console.error(`⚠️ Failed to send email to ${user?.email}:`, emailError.message);
            // Continue processing even if email fails
          }
        }

        // Update draw status
        await client.query(
          `UPDATE lottery_draws SET status = 'paid_out', updated_at = CURRENT_TIMESTAMP WHERE draw_date = $1`,
          [drawDate]
        );

        console.log(`💵 Total paid out: ${totalPaid.toFixed(2)} BRT`);
        console.log(`💰 Admin fees collected: ${adminFees.toFixed(2)} BRT`);

        return {
          winnersCount: winners.length,
          totalPaid: totalPaid,
          adminFees: adminFees,
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