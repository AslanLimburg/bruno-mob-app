const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bruno_token_app',
  password: 'password',
  port: 5432,
});

async function fixPasswords() {
  try {
    console.log('🔧 Fixing password hashes for test users...');

    const testUsers = [
      'alice@test.com',
      'bob@test.com', 
      'charlie@test.com',
      'diana@test.com'
    ];

    for (const email of testUsers) {
      // Генерируем новый хеш с помощью bcryptjs
      const newHash = await bcrypt.hash('test1234', 10);
      
      // Обновляем хеш в базе данных
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [newHash, email]
      );
      
      console.log(`✅ Updated password hash for ${email}`);
    }

    console.log('\n🎉 All password hashes updated successfully!');
    console.log('📧 Test credentials:');
    console.log('   alice@test.com / test1234');
    console.log('   bob@test.com / test1234');
    console.log('   charlie@test.com / test1234');
    console.log('   diana@test.com / test1234');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await pool.end();
  }
}

fixPasswords();
