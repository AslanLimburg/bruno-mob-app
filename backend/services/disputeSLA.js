const { pool } = require('../config/database');

class DisputeSLA {
  async checkDeadlines() {
    try {
      console.log('🔍 Checking dispute deadlines...');
      const expiredDisputes = await pool.query(
        "SELECT d.id, d.challenge_id FROM disputes d WHERE d.status IN ('open', 'under_review') AND d.deadline < NOW()"
      );
      if (expiredDisputes.rows.length === 0) {
        console.log('✅ No expired disputes');
        return { success: true, expiredCount: 0 };
      }
      console.log('⚠️ Found ' + expiredDisputes.rows.length + ' expired dispute(s)');
      return { success: true, expiredCount: expiredDisputes.rows.length };
    } catch (error) {
      console.error('❌ Error checking dispute deadlines:', error);
      return { success: false, error: error.message };
    }
  }

  start() {
    console.log('⏰ Dispute SLA Checker started (runs every hour)');
    this.checkDeadlines();
    setInterval(() => this.checkDeadlines(), 3600000); // Каждый час
  }
}

module.exports = new DisputeSLA();