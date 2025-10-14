require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting lottery migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/001_create_lottery_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - lottery_draws');
    console.log('   - lottery_jackpot (initialized with 100 BRT)');
    console.log('   - lottery_tickets');
    console.log('   - lottery_prize_distribution (6 prize categories)');
    console.log('   - lottery_payouts');
    
    const jackpotResult = await client.query('SELECT total_amount FROM lottery_jackpot WHERE id = 1');
    if (jackpotResult.rows.length > 0) {
      console.log(`💰 Current Jackpot: ${jackpotResult.rows[0].total_amount} BRT`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();