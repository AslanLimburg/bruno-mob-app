require('dotenv').config();
const fs = require('fs');
const { pool } = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting Club Avalanche migration...');
    
    const sql = fs.readFileSync('./migrations/002_create_club_avalanche_tables.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Club Avalanche tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
