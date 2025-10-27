require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  console.log('🔄 Starting migrations...\n');

  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration files\n`);

    for (const file of sqlFiles) {
      console.log(`📄 Running: ${file}`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, 'utf8');
      await pool.query(sql);
      console.log(`✅ Completed: ${file}\n`);
    }

    console.log('🎉 All migrations completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();
