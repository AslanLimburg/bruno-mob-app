const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'brunotoken',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration(filePath) {
  const fileName = path.basename(filePath);
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    if (!sql.trim()) return;
    
    console.log(`📄 Running: ${fileName}`);
    await pool.query(sql);
    console.log(`✅ Success: ${fileName}\n`);
  } catch (error) {
    console.log(`❌ Failed: ${fileName} - ${error.message}\n`);
  }
}

async function main() {
  const dirs = [
    path.join(__dirname, 'migrations')
  ];

  const files = [];
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const dirFiles = fs.readdirSync(dir)
        .filter(f => f.endsWith('.sql'))
        .map(f => path.join(dir, f));
      files.push(...dirFiles);
    }
  }

  files.sort();
  console.log(`Found ${files.length} additional migrations\n`);

  for (const file of files) {
    await runMigration(file);
  }

  await pool.end();
  console.log('🎉 All migrations complete!\n');
}

main();
