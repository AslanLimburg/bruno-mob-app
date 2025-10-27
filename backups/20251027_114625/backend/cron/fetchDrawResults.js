require('dotenv').config();
const cron = require('node-cron');
const lotteryAPI = require('../services/lotteryAPI');

async function fetchAndSaveDrawResults() {
  try {
    console.log('\n🎲 ========== Fetch Draw Results Job Started ==========');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    const drawData = await lotteryAPI.fetchLatestDrawResults();
    const savedDraw = await lotteryAPI.saveDrawResults(drawData);
    
    console.log('✅ Draw results saved successfully');
    console.log(`📅 Draw Date: ${savedDraw.draw_date}`);
    console.log(`🎱 Numbers: ${drawData.white_ball_1}, ${drawData.white_ball_2}, ${drawData.white_ball_3}, ${drawData.white_ball_4}, ${drawData.white_ball_5}`);
    console.log(`🔴 Powerball: ${drawData.powerball}`);
    console.log('🎲 ========== Job Completed ==========\n');
    
  } catch (error) {
    console.error('❌ Error in fetch draw results job:', error.message);
    console.log('🎲 ========== Job Failed ==========\n');
  }
}

// Run every day at 23:00 (11 PM)
cron.schedule('0 23 * * *', fetchAndSaveDrawResults, {
  timezone: 'America/New_York'
});

console.log('🤖 Fetch Draw Results Cron Job Started');
console.log('📅 Schedule: Every day at 11:00 PM EST');

// Run immediately on startup for testing
if (process.argv.includes('--now')) {
  console.log('🚀 Running job immediately for testing...');
  fetchAndSaveDrawResults();
}