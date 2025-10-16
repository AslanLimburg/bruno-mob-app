const payoutScheduler = require('./services/payoutScheduler');
const challengeScheduler = require('./services/challengeScheduler');
const disputeSLAChecker = require('./services/disputeSLA');
const { startMessengerCleanup } = require('./services/messengerCleanup');

function startAllSchedulers() {
  console.log('🕐 Starting Unified Scheduler...');
  
  // Запускаем schedulers (они инстансы классов)
  payoutScheduler.start();
  challengeScheduler.start();
  disputeSLAChecker.start();
  
  // Messenger cleanup
  startMessengerCleanup();
  
  console.log('✅ All schedulers initialized');
}

module.exports = { startAllSchedulers };
