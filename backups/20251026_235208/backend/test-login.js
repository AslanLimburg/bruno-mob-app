const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bruno_token_app',
  password: 'password',
  port: 5432,
});

async function testLogin() {
  try {
    console.log('🔍 Testing login process...');

    const email = 'alice@test.com';
    const password = 'test1234';

    // 1. Найти пользователя
    console.log('1. Finding user...');
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ User found:', user.email);
    console.log('   Status:', user.account_status);
    console.log('   Email verified:', user.email_verified);

    // 2. Проверить статус
    if (user.account_status !== 'active') {
      console.log('❌ Account not active:', user.account_status);
      return;
    }

    // 3. Проверить пароль
    console.log('2. Verifying password...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('   Password valid:', isValid);

    if (!isValid) {
      console.log('❌ Invalid password');
      return;
    }

    console.log('✅ Login successful!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testLogin();
