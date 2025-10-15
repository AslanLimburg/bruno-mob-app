const { pool } = require('../config/database');
const ledgerService = require('../services/ledgerService');

class PayoutWorker {
  /**
   * Обработать выплаты для челленджа
   * @param {number} challengeId - ID челленджа
   * @returns {Object} - Результат обработки
   */
  async processPayouts(challengeId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      console.log(`\n🎯 Starting payout processing for challenge ${challengeId}...`);

      // 1. Получить challenge
      const challengeQuery = `
        SELECT * FROM challenges
        WHERE id = $1 AND status = 'resolved'
        FOR UPDATE
      `;
      const challengeResult = await client.query(challengeQuery, [challengeId]);

      if (challengeResult.rows.length === 0) {
        throw new Error('Challenge not found or not in resolved status');
      }

      const challenge = challengeResult.rows[0];

      if (!challenge.winning_option_id) {
        throw new Error('Challenge has no winning option set');
      }

      console.log(`📋 Challenge: ${challenge.title}`);
      console.log(`🏆 Winning option: ${challenge.winning_option_id}`);
      console.log(`💰 Payout mode: ${challenge.payout_mode}`);

      // 2. Получить все ставки
      const betsQuery = `
        SELECT * FROM bets
        WHERE challenge_id = $1 AND status = 'active'
        FOR UPDATE
      `;
      const betsResult = await client.query(betsQuery, [challengeId]);
      const allBets = betsResult.rows;

      if (allBets.length === 0) {
        console.log('⚠️ No active bets found for this challenge');
        await client.query('COMMIT');
        return { success: true, message: 'No bets to process' };
      }

      console.log(`📊 Total bets: ${allBets.length}`);

      // 3. Разделить на победителей и проигравших
      const winningBets = allBets.filter(bet => bet.option_id === challenge.winning_option_id);
      const losingBets = allBets.filter(bet => bet.option_id !== challenge.winning_option_id);

      console.log(`✅ Winning bets: ${winningBets.length}`);
      console.log(`❌ Losing bets: ${losingBets.length}`);

      // 4. Вычислить pool и commission
      const totalPool = allBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
      const commission = totalPool * 0.10; // 10%
      const distributableAmount = totalPool - commission;

      console.log(`💵 Total pool: ${totalPool.toFixed(2)} BRT`);
      console.log(`🏦 Commission (10%): ${commission.toFixed(2)} BRT`);
      console.log(`💸 Distributable: ${distributableAmount.toFixed(2)} BRT`);

      // 5. Обработать выплаты в зависимости от режима
      let payoutResults;

      if (challenge.payout_mode === 'pool_based') {
        payoutResults = await this.processPoolBasedPayouts(
          client,
          challenge,
          winningBets,
          distributableAmount
        );
      } else if (challenge.payout_mode === 'fixed_creator_prize') {
        payoutResults = await this.processFixedPrizePayouts(
          client,
          challenge,
          winningBets
        );
      } else {
        throw new Error(`Unknown payout mode: ${challenge.payout_mode}`);
      }

      // 6. Обновить проигравшие ставки
      for (const bet of losingBets) {
        await client.query(
          `UPDATE bets SET status = 'lost', payout = 0 WHERE id = $1`,
          [bet.id]
        );
      }

      console.log(`💀 Updated ${losingBets.length} losing bets`);

      // 7. Начислить комиссию на admin (id=1)
      const adminId = 1;
      await ledgerService.creditCommission(client, adminId, commission, challengeId);
      console.log(`🏦 Commission ${commission.toFixed(2)} BRT credited to admin (id=${adminId})`);

      // 8. Обновить payout_job status
      await client.query(
        `UPDATE payout_jobs 
         SET status = 'completed', completed_at = NOW()
         WHERE challenge_id = $1 AND status = 'pending'`,
        [challengeId]
      );

      await client.query('COMMIT');

      console.log(`✅ Payout processing completed for challenge ${challengeId}\n`);

      return {
        success: true,
        totalPool,
        commission,
        distributableAmount,
        winningBetsCount: winningBets.length,
        losingBetsCount: losingBets.length,
        payouts: payoutResults
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Error processing payouts for challenge ${challengeId}:`, error.message);

      // Обновить payout_job с ошибкой
      await client.query(
        `UPDATE payout_jobs 
         SET status = 'failed', 
             error_message = $1,
             attempt_count = attempt_count + 1
         WHERE challenge_id = $2 AND status = 'pending'`,
        [error.message, challengeId]
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Pool-based выплаты: победители делят пул пропорционально ставкам
   */
  async processPoolBasedPayouts(client, challenge, winningBets, distributableAmount) {
    if (winningBets.length === 0) {
      console.log('⚠️ No winning bets - all money goes to commission');
      return [];
    }

    // Сумма всех победивших ставок
    const winningPool = winningBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);

    console.log(`🎯 Winning pool: ${winningPool.toFixed(2)} BRT`);

    const payouts = [];

    for (const bet of winningBets) {
      const betAmount = parseFloat(bet.amount);
      
      // Пропорциональная доля от distributable amount
      const userPayout = (betAmount / winningPool) * distributableAmount;

      // Начислить выигрыш
      await ledgerService.creditPayout(
        client,
        bet.user_id,
        userPayout,
        challenge.id,
        bet.id
      );

      // Обновить bet
      await client.query(
        `UPDATE bets 
         SET status = 'won', payout = $1
         WHERE id = $2`,
        [userPayout, bet.id]
      );

      payouts.push({
        userId: bet.user_id,
        betId: bet.id,
        betAmount: betAmount,
        payout: userPayout
      });

      console.log(`💰 User ${bet.user_id}: bet ${betAmount.toFixed(2)} BRT → payout ${userPayout.toFixed(2)} BRT`);
    }

    return payouts;
  }

  /**
   * Fixed creator prize выплаты: победители делят фиксированный приз
   */
  async processFixedPrizePayouts(client, challenge, winningBets) {
    const creatorPrize = parseFloat(challenge.creator_prize_reserved) || 0;

    if (creatorPrize === 0) {
      throw new Error('Creator prize is not set for fixed_creator_prize mode');
    }

    if (winningBets.length === 0) {
      console.log('⚠️ No winning bets - creator prize stays reserved');
      return [];
    }

    console.log(`🎁 Creator prize: ${creatorPrize.toFixed(2)} BRT`);

    // Сумма всех победивших ставок
    const winningPool = winningBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);

    const payouts = [];

    for (const bet of winningBets) {
      const betAmount = parseFloat(bet.amount);
      
      // Пропорциональная доля от creator prize
      const userPayout = (betAmount / winningPool) * creatorPrize;

      // Начислить выигрыш
      await ledgerService.creditPayout(
        client,
        bet.user_id,
        userPayout,
        challenge.id,
        bet.id
      );

      // Обновить bet
      await client.query(
        `UPDATE bets 
         SET status = 'won', payout = $1
         WHERE id = $2`,
        [userPayout, bet.id]
      );

      payouts.push({
        userId: bet.user_id,
        betId: bet.id,
        betAmount: betAmount,
        payout: userPayout
      });

      console.log(`💰 User ${bet.user_id}: bet ${betAmount.toFixed(2)} BRT → payout ${userPayout.toFixed(2)} BRT`);
    }

    return payouts;
  }
}

module.exports = new PayoutWorker();
