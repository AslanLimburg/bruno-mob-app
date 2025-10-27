// Script to run Powerball migration
// Path: ~/bruno-token-app/backend/scripts/runPowerballMigration.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting Powerball migration...\n');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bruno_token_db',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL database\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_create_powerball_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created tables:');
    console.log('   - lottery_draws');
    console.log('   - lottery_jackpot (initialized with 100 BRUNO)');
    console.log('   - lottery_tickets');
    console.log('   - lottery_prize_distribution (6 prize categories)');
    console.log('   - lottery_payouts');
    console.log('   - admin_wallet\n');
    
    // Check jackpot
    const [jackpot] = await connection.query('SELECT * FROM lottery_jackpot WHERE id = 1');
    if (jackpot.length > 0) {
      console.log('💰 Current Jackpot:', jackpot[0].total_amount, 'BRUNO\n');
    }
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    
    if (connection) {
      await connection.end();
    }
    
    process.exit(1);
  }
}

runMigration();