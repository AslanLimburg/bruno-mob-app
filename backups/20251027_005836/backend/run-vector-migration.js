require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runVectorMigration() {
  console.log('🔄 Running Vector Destiny migration...\n');

  try {
    const migrationPath = path.join(__dirname, 'migrations', '006_create_vector_destiny_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration: 006_create_vector_destiny_tables.sql');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Проверяем созданные таблицы
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vector%'
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Проверяем количество вопросов
    const questionsCount = await pool.query('SELECT COUNT(*) FROM vector_questions');
    console.log(`\n📝 Inserted ${questionsCount.rows[0].count} questions\n`);
    
    console.log('🎉 Vector Destiny is ready to use!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runVectorMigration();

