const { query, transaction } = require('../config/database');
const { sendChallengeWinEmail } = require('../services/emailService');

class PayoutWorker {
  async processCompletedChallenges() {
    try {
      console.log('🏆 Processing completed challenges...');
      
      // Find all completed challenges that haven't been paid out
      const result = await query(
        `SELECT * FROM challenges 
         WHERE status = 'completed' 
         AND payout_status = 'pending'
         AND end_date < CURRENT_TIMESTAMP`
      );

      const challenges = result.rows;
      console.log(`📋 Found ${challenges.length} challenges to process`);

      for (const challenge of challenges) {
        try {
          await this.processChallengeWinner(challenge);
        } catch (error) {
          console.error(`❌ Failed to process challenge ${challenge.id}:`, error.message);
        }
      }

      console.log('✅ All challenges processed');
    } catch (error) {
      console.error('❌ Payout worker error:', error);
      throw error;
    }
  }

  async processChallengeWinner(challenge) {
    return await transaction(async (client) => {
      console.log(`\n💰 Processing challenge: ${challenge.title} (ID: ${challenge.id})`);

      // Find the winner
      const winnerResult = await client.query(
        `SELECT cp.*, u.id, u.name, u.email
         FROM challenge_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.challenge_id = $1
         ORDER BY cp.progress DESC, cp.joined_at ASC
         LIMIT 1`,
        [challenge.id]
      );

      if (winnerResult.rows.length === 0) {
        console.log('⚠️ No participants found');
        
        // Mark as completed but no winner
        await client.query(
          `UPDATE challenges 
           SET payout_status = 'no_winner', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [challenge.id]
        );
        return;
      }

      const winner = winnerResult.rows[0];
      console.log(`🏆 Winner: ${winner.name} (${winner.email})`);

      // Calculate prize (80% to winner, 20% admin fee)
      const totalPrize = parseFloat(challenge.total_prize);
      const adminFee = totalPrize * 0.20; // 20% комиссия
      const winnerPayout = totalPrize * 0.80; // 80% победителю

      console.log(`💵 Total Prize: ${totalPrize} BRT`);
      console.log(`💰 Admin Fee (20%): ${adminFee} BRT`);
      console.log(`🎁 Winner Payout (80%): ${winnerPayout} BRT`);

      // 1. Deduct full prize from admin
      await client.query(
        `UPDATE user_balances 
         SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [totalPrize]
      );

      // 2. Return 20% admin fee
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = 1 AND crypto = 'BRT'`,
        [adminFee]
      );

      // 3. Pay 80% to winner
      await client.query(
        `UPDATE user_balances 
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND crypto = 'BRT'`,
        [winnerPayout, winner.user_id]
      );

      // 4. Record transaction (Admin → Winner)
      await client.query(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, crypto, amount, type, status, metadata)
         VALUES (1, $1, 'BRT', $2, 'challenge_prize', 'completed', $3::jsonb)`,
        [winner.user_id, winnerPayout, JSON.stringify({
          challenge_id: challenge.id,
          challenge_title: challenge.title,
          total_prize: totalPrize,
          admin_fee: adminFee,
          winner_payout: winnerPayout
        })]
      );

      // 5. Update challenge status
      await client.query(
        `UPDATE challenges 
         SET winner_id = $1, 
             payout_status = 'completed',
             payout_amount = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [winner.user_id, winnerPayout, challenge.id]
      );

      // 6. Update participant record
      await client.query(
        `UPDATE challenge_participants 
         SET status = 'won', prize_awarded = $1, updated_at = CURRENT_TIMESTAMP
         WHERE challenge_id = $2 AND user_id = $3`,
        [winnerPayout, challenge.id, winner.user_id]
      );

      console.log(`✅ Prize paid to winner: ${winnerPayout} BRT`);

      // 📧 Send email notification
      try {
        await sendChallengeWinEmail(
          winner.email,
          winner.name || 'Challenger',
          winnerPayout.toFixed(2),
          challenge.title
        );
        console.log(`📧 Email sent to ${winner.email}`);
      } catch (emailError) {
        console.error(`⚠️ Failed to send email to ${winner.email}:`, emailError.message);
        // Continue even if email fails
      }

      return {
        challengeId: challenge.id,
        winnerId: winner.user_id,
        winnerName: winner.name,
        totalPrize: totalPrize,
        adminFee: adminFee,
        winnerPayout: winnerPayout
      };
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const worker = new PayoutWorker();
  worker.processCompletedChallenges()
    .then(() => {
      console.log('🎉 Payout worker finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Payout worker failed:', error);
      process.exit(1);
    });
}

module.exports = new PayoutWorker();