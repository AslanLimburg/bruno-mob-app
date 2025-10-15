const payoutScheduler = require('./services/payoutScheduler');
const disputeSLA = require('./services/disputeSLA');
const challengeScheduler = require('./services/challengeScheduler');

class UnifiedScheduler {
  
  start() {
    console.log('🕐 Starting Unified Scheduler...');

    // Запуск Payout Scheduler (каждую минуту)
    payoutScheduler.start();

    // Challenge Scheduler (каждую минуту)
    setInterval(() => {
      challengeScheduler.processScheduled();
    }, 60000); // 1 minute
    console.log('⏰ Challenge Scheduler started (runs every minute)');

    // Dispute SLA Checker (каждый час)
    setInterval(() => {
      disputeSLA.checkDeadlines();
    }, 3600000); // 1 hour
    console.log('⏰ Dispute SLA Checker started (runs every hour)');

    // Первый запуск сразу (optional)
    setTimeout(() => {
      challengeScheduler.processScheduled();
    }, 5000); // через 5 секунд после старта

    console.log('✅ All schedulers initialized');
  }

  // Ручной trigger для тестирования
  async triggerAll() {
    console.log('🔄 Manual trigger: Running all schedulers...');
    
    await challengeScheduler.processScheduled();
    await payoutScheduler.processPendingJobs();
    await disputeSLA.checkDeadlines();
    
    console.log('✅ All schedulers executed');
  }
}

module.exports = new UnifiedScheduler();
