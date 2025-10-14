require('dotenv').config();
const cron = require('node-cron');
const { query } = require('../config/database');
const lotteryChecker = require('../services/lotteryChecker');
const lotteryPayout = require('../services/lotteryPayout');

async function checkAndPayoutTickets() {
  try {
    console.log('\n🎫 ========== Check Tickets Job Started ==========');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Find draws that need checking
    const result = await query(
      `SELECT draw_date FROM lottery_draws 
       WHERE status = 'drawn' 
       ORDER BY draw_date ASC`
    );

    const draws = result.rows;

    if (draws.length === 0) {
      console.log('ℹ️ No draws to check');
      console.log('🎫 ========== Job Completed ==========\n');
      return;
    }

    for (const draw of draws) {
      console.log(`\n📊 Processing draw: ${draw.draw_date}`);
      
      // Check tickets
      const checkResults = await lotteryChecker.checkTickets(draw.draw_date);
      console.log(`✅ Checked ${checkResults.totalTickets} tickets`);
      console.log(`🎉 Found ${checkResults.winners} winners`);
      
      // Process payouts
      const payoutResults = await lotteryPayout.processPayouts(draw.draw_date);
      console.log(`💰 Paid out ${payoutResults.totalPaid.toFixed(2)} BRT to ${payoutResults.winnersCount} winners`);
      
      if (payoutResults.jackpotWon) {
        console.log('🏆 JACKPOT WON! Jackpot has been reset to 100 BRT');
      }
    }
    
    console.log('\n🎫 ========== Job Completed Successfully ==========\n');
    
  } catch (error) {
    console.error('❌ Error in check tickets job:', error.message);
    console.error(error);
    console.log('🎫 ========== Job Failed ==========\n');
  }
}

// Run every day at 23:30 (11:30 PM) - 30 minutes after draw fetch
cron.schedule('30 23 * * *', checkAndPayoutTickets, {
  timezone: 'America/New_York'
});

console.log('🤖 Check Tickets Cron Job Started');
console.log('📅 Schedule: Every day at 11:30 PM EST');

// Run immediately on startup for testing
if (process.argv.includes('--now')) {
  console.log('🚀 Running job immediately for testing...');
  checkAndPayoutTickets();
}