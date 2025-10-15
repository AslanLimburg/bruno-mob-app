require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    console.log(`🔄 Starting migration: ${migrationFile}...`);
    
    const migrationPath = path.join(__dirname, '../migrations/', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node runMigration.js <migration_file.sql>');
  console.error('Example: node runMigration.js 003_create_challenge_tables.sql');
  process.exit(1);
}

runMigration(migrationFile);
