const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bruno_token_app',
  password: 'password',
  port: 5432,
});

async function createWorkingUser() {
  try {
    console.log('🔧 Creating working test user...');

    const email = 'working@test.com';
    const password = 'test1234';
    const name = 'Working User';

    // Проверяем, существует ли пользователь
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists:', email);
      return;
    }

    // Создаем хеш пароля с помощью bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Генерируем реферальный код
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Создаем пользователя
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, email_verified, referral_code, account_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, referral_code',
      [email, passwordHash, name, true, referralCode, 'active']
    );

    const user = result.rows[0];

    // Создаем балансы для всех криптовалют
    const cryptos = ['BRT', 'BRTC', 'USDT', 'USDC', 'ETH', 'BTC', 'TRX'];
    for (const crypto of cryptos) {
      await pool.query(
        'INSERT INTO user_balances (user_id, crypto, balance) VALUES ($1, $2, 0)',
        [user.id, crypto]
      );
    }

    console.log('✅ Created working user:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   ID:', user.id);
    console.log('   Referral Code:', user.referral_code);
    console.log('\n📧 Test credentials:');
    console.log('   working@test.com / test1234');

    // Тестируем аутентификацию
    console.log('\n🔍 Testing authentication...');
    const testResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const testUser = testResult.rows[0];
    
    const isValid = await bcrypt.compare(password, testUser.password_hash);
    console.log('   Password valid:', isValid);

    if (isValid) {
      console.log('✅ Authentication test passed!');
    } else {
      console.log('❌ Authentication test failed!');
    }

  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await pool.end();
  }
}

createWorkingUser();
