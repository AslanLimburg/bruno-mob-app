const pool = require('../config/database');
const payoutWorker = require('../workers/payoutWorker');

class PayoutScheduler {
  constructor() {
    this.isProcessing = false;
    this.maxAttempts = 3;
  }

  /**
   * Запустить scheduler (вызывается из server.js)
   */
  start() {
    console.log('🕐 Payout Scheduler started (runs every minute)');
    
    // Запускать каждую минуту
    this.intervalId = setInterval(() => {
      this.processPendingJobs();
    }, 60000); // 60 секунд

    // Запустить сразу при старте
    this.processPendingJobs();
  }

  /**
   * Остановить scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 Payout Scheduler stopped');
    }
  }

  /**
   * Обработать все pending payout jobs
   */
  async processPendingJobs() {
    if (this.isProcessing) {
      console.log('⏳ Payout processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Найти все pending jobs
      const query = `
        SELECT pj.*, c.title as challenge_title
        FROM payout_jobs pj
        JOIN challenges c ON pj.challenge_id = c.id
        WHERE pj.status = 'pending'
          AND pj.attempt_count < $1
        ORDER BY pj.created_at ASC
        LIMIT 10
      `;

      const result = await pool.query(query, [this.maxAttempts]);
      const jobs = result.rows;

      if (jobs.length === 0) {
        return;
      }

      console.log(`\n🔔 Found ${jobs.length} pending payout job(s)`);

      // Обработать каждый job
      for (const job of jobs) {
        await this.processJob(job);
      }

    } catch (error) {
      console.error('❌ Error in payout scheduler:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Обработать один payout job
   */
  async processJob(job) {
    console.log(`\n📦 Processing payout job ${job.id} for challenge ${job.challenge_id} (${job.challenge_title})`);
    console.log(`   Attempt ${job.attempt_count + 1}/${this.maxAttempts}`);

    try {
      // Обновить status на 'processing'
      await pool.query(
        `UPDATE payout_jobs 
         SET status = 'processing', started_at = NOW()
         WHERE id = $1`,
        [job.id]
      );

      // Запустить payout worker
      const result = await payoutWorker.processPayouts(job.challenge_id);

      console.log(`✅ Payout job ${job.id} completed successfully`);
      console.log(`   Winning bets: ${result.winningBetsCount}`);
      console.log(`   Total distributed: ${result.distributableAmount?.toFixed(2) || 0} BRT`);

    } catch (error) {
      console.error(`❌ Payout job ${job.id} failed:`, error.message);

      const attemptCount = job.attempt_count + 1;

      if (attemptCount >= this.maxAttempts) {
        // Превышено максимальное количество попыток
        console.error(`   Max attempts (${this.maxAttempts}) reached. Job marked as failed.`);
        
        await pool.query(
          `UPDATE payout_jobs 
           SET status = 'failed',
               error_message = $1,
               attempt_count = $2
           WHERE id = $3`,
          [error.message, attemptCount, job.id]
        );
      } else {
        // Вернуть в pending для повторной попытки
        console.log(`   Will retry later (attempt ${attemptCount}/${this.maxAttempts})`);
        
        await pool.query(
          `UPDATE payout_jobs 
           SET status = 'pending',
               error_message = $1,
               attempt_count = $2
           WHERE id = $3`,
          [error.message, attemptCount, job.id]
        );
      }
    }
  }

  /**
   * Ручной trigger для обработки конкретного челленджа
   */
  async triggerManualPayout(challengeId) {
    console.log(`\n🎯 Manual payout trigger for challenge ${challengeId}`);

    try {
      const result = await payoutWorker.processPayouts(challengeId);
      return {
        success: true,
        message: 'Payout processed successfully',
        data: result
      };
    } catch (error) {
      console.error(`❌ Manual payout failed:`, error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new PayoutScheduler();
