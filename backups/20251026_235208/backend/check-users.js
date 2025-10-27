const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function checkUsers() {
  try {
    console.log('\n🔌 Подключаемся к базе:', process.env.DB_NAME);
    
    const result = await pool.query(`
      SELECT id, email, role, created_at, balances
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║         📊 ПОЛЬЗОВАТЕЛИ В БАЗЕ ДАННЫХ         ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    if (result.rows.length === 0) {
      console.log('❌ База данных ПУСТА! Нет пользователей.\n');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. 👤 ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Роль: ${user.role || 'user'}`);
        console.log(`   Создан: ${user.created_at}`);
        console.log(`   Балансы: ${JSON.stringify(user.balances || {}, null, 2)}`);
        console.log('   ' + '─'.repeat(50));
      });
      
      console.log(`\n✅ Всего пользователей: ${result.rows.length}\n`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ОШИБКА:', err.message);
    console.error('💡 Проверьте настройки базы данных в .env!\n');
    process.exit(1);
  }
}

checkUsers();
