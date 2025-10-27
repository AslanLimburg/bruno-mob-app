const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bruno_token_app',
  password: 'password',
  port: 5432,
});

async function fixTestUserPasswords() {
  try {
    console.log('🔧 Fixing test user passwords...');

    const testUsers = [
      'alice@test.com',
      'bob@test.com',
      'charlie@test.com',
      'diana@test.com',
      'working@test.com'
    ];

    const password = 'test1234';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('🔐 New password hash:', passwordHash);

    for (const email of testUsers) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name',
        [passwordHash, email]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Updated password for: ${result.rows[0].email} (${result.rows[0].name})`);
      } else {
        console.log(`❌ User not found: ${email}`);
      }
    }

    console.log('\n🧪 Testing password verification...');
    const testResult = await pool.query('SELECT * FROM users WHERE email = $1', ['alice@test.com']);
    const testUser = testResult.rows[0];
    
    const isValid = await bcrypt.compare(password, testUser.password_hash);
    console.log('   Password valid:', isValid);

    if (isValid) {
      console.log('\n✅ All passwords updated successfully!');
      console.log('\n📧 Test credentials:');
      console.log('   alice@test.com / test1234');
      console.log('   bob@test.com / test1234');
      console.log('   charlie@test.com / test1234');
      console.log('   diana@test.com / test1234');
      console.log('   working@test.com / test1234');
    } else {
      console.log('\n❌ Password verification failed!');
    }

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    await pool.end();
  }
}

fixTestUserPasswords();
