const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkStructure() {
  try {
    // Смотрим структуру таблицы users
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 СТРУКТУРА ТАБЛИЦЫ USERS:\n');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Теперь посмотрим пользователей
    const users = await pool.query('SELECT * FROM users LIMIT 5');
    
    console.log('\n\n👥 ПОЛЬЗОВАТЕЛИ:\n');
    users.rows.forEach((user, i) => {
      console.log(`\n${i + 1}. ${user.email || user.username || 'Unknown'}`);
      console.log(`   Все поля:`, JSON.stringify(user, null, 2));
    });
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

checkStructure();
