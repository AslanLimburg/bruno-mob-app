const { pool } = require('../config/database');

class ChallengeScheduler {
  
  async processScheduled() {
    try {
      console.log('🔍 Processing scheduled challenges...');

      // 1. Автоматически открыть челленджи
      const openResult = await pool.query(
        "UPDATE challenges SET status = 'open', updated_at = NOW() WHERE status = 'draft' AND open_accepting_at <= NOW() RETURNING id, title"
      );

      if (openResult.rows.length > 0) {
        console.log('✅ Opened ' + openResult.rows.length + ' challenge(s):');
        openResult.rows.forEach(c => console.log('   - Challenge #' + c.id + ': ' + c.title));
      }

      // 2. Автоматически закрыть челленджи
      const closeResult = await pool.query(
        "UPDATE challenges SET status = 'closed_for_bets', updated_at = NOW() WHERE status = 'open' AND close_accepting_at <= NOW() RETURNING id, title"
      );

      if (closeResult.rows.length > 0) {
        console.log('✅ Closed ' + closeResult.rows.length + ' challenge(s):');
        closeResult.rows.forEach(c => console.log('   - Challenge #' + c.id + ': ' + c.title));
      }

      if (openResult.rows.length === 0 && closeResult.rows.length === 0) {
        console.log('✅ No scheduled actions needed');
      }

      return {
        success: true,
        opened: openResult.rows.length,
        closed: closeResult.rows.length
      };

    } catch (error) {
      console.error('❌ Error processing scheduled challenges:', error);
      return { success: false, error: error.message };
    }
  }

  async getUpcomingSchedules() {
    try {
      const result = await pool.query(
        "SELECT id, title, status, open_accepting_at, close_accepting_at FROM challenges WHERE status IN ('draft', 'open') AND (open_accepting_at IS NOT NULL OR close_accepting_at IS NOT NULL) ORDER BY COALESCE(open_accepting_at, close_accepting_at) ASC LIMIT 10"
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting upcoming schedules:', error);
      return [];
    }
  }
}

module.exports = new ChallengeScheduler();
