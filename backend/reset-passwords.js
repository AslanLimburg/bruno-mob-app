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

async function resetPasswords() {
  try {
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔐 Хэш пароля:', hashedPassword);
    console.log('🔑 Пароль:', password);
    console.log('\n📝 Обновляем пароли...\n');
    
    const users = [
      'super-admin@brunotoken.com',
      'admin@brunotoken.com',
      'treasury@brunotoken.com',
      'gasfee@brunotoken.com'
    ];
    
    for (const email of users) {
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      console.log(`✅ ${email} - пароль обновлён`);
    }
    
    console.log('\n✅ Все пароли обновлены!');
    console.log('🔐 Новый пароль для всех: Admin123!\n');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

resetPasswords();
