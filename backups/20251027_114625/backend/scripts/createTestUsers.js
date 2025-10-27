const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bruno_token_app',
  password: 'password',
  port: 5432,
});

async function createTestUsers() {
  try {
    console.log('🚀 Creating test users for messenger...');

    // Создаем несколько тестовых пользователей
    const testUsers = [
      {
        email: 'alice@test.com',
        password: 'test1234',
        name: 'Alice Johnson',
        email_verified: true
      },
      {
        email: 'bob@test.com', 
        password: 'test1234',
        name: 'Bob Smith',
        email_verified: true
      },
      {
        email: 'charlie@test.com',
        password: 'test1234', 
        name: 'Charlie Brown',
        email_verified: true
      },
      {
        email: 'diana@test.com',
        password: 'test1234',
        name: 'Diana Prince',
        email_verified: true
      }
    ];

    for (const user of testUsers) {
      // Проверяем, существует ли пользователь
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`✅ User ${user.email} already exists`);
        continue;
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Генерируем реферальный код
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Создаем пользователя (без указания ID, чтобы база сама назначила)
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, name, email_verified, referral_code) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, referral_code',
        [user.email, passwordHash, user.name, user.email_verified, referralCode]
      );

      console.log(`✅ Created user: ${user.name} (${user.email})`);
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Referral Code: ${result.rows[0].referral_code}`);
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📧 Test credentials:');
    console.log('   alice@test.com / test1234');
    console.log('   bob@test.com / test1234');
    console.log('   charlie@test.com / test1234');
    console.log('   diana@test.com / test1234');
    console.log('\n💬 You can now test the messenger with these users!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await pool.end();
  }
}

createTestUsers();
