const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function updateRoles() {
  try {
    // 1. Обновим роли существующих пользователей
    await pool.query(`UPDATE users SET role = 'gasfee' WHERE email = 'gasfee@brunotoken.com'`);
    console.log('✅ gasfee@brunotoken.com → роль изменена на "gasfee"');
    
    await pool.query(`UPDATE users SET role = 'treasury' WHERE email = 'treasury@brunotoken.com'`);
    console.log('✅ treasury@brunotoken.com → роль изменена на "treasury"');
    
    // 2. Создадим admin и super-admin
    const password = 'Admin123!'; // Временный пароль - ИЗМЕНИТЕ ПОТОМ!
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Admin
    await pool.query(`
      INSERT INTO users (email, password_hash, name, email_verified, role, account_status, brt_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    `, ['admin@brunotoken.com', hashedPassword, 'Admin', true, 'admin', 'active', 0]);
    console.log('✅ admin@brunotoken.com создан | Пароль: Admin123!');
    
    // Super Admin
    await pool.query(`
      INSERT INTO users (email, password_hash, name, email_verified, role, account_status, brt_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
    `, ['super-admin@brunotoken.com', hashedPassword, 'Super Admin', true, 'super-admin', 'active', 0]);
    console.log('✅ super-admin@brunotoken.com создан | Пароль: Admin123!');
    
    console.log('\n📊 ПРОВЕРЯЕМ РЕЗУЛЬТАТ:\n');
    
    // Проверим результат
    const result = await pool.query(`
      SELECT email, role, brt_balance 
      FROM users 
      WHERE email IN ('gasfee@brunotoken.com', 'treasury@brunotoken.com', 'admin@brunotoken.com', 'super-admin@brunotoken.com')
      ORDER BY email
    `);
    
    result.rows.forEach(user => {
      console.log(`👤 ${user.email.padEnd(35)} | Роль: ${user.role.padEnd(12)} | BRT: ${user.brt_balance}`);
    });
    
    console.log('\n✅ ВСЁ ГОТОВО!\n');
    console.log('🔐 Пароль для admin и super-admin: Admin123!');
    console.log('⚠️  ИЗМЕНИТЕ ЭТИ ПАРОЛИ ПОСЛЕ ПЕРВОГО ВХОДА!\n');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

updateRoles();
