require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function createServiceAccounts() {
  try {
    const password = await bcrypt.hash('service-account-secure-password', 10);
    
    // 1. Главный резервный фонд
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (1, 'admin@brunotoken.com', $1, 'Reserve Fund', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    // 2. Gas Fee фонд
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (2, 'gasfee@brunotoken.com', $1, 'Gas Fee Fund', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    console.log('✅ Service accounts created');
    
    // Создать балансы BRT
    const accounts = [1, 2];
    for (const userId of accounts) {
      await query(`
        INSERT INTO user_balances (user_id, crypto, balance)
        VALUES ($1, 'BRT', 0)
        ON CONFLICT (user_id, crypto) DO NOTHING
      `, [userId]);
    }
    
    console.log('✅ Service account balances created');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createServiceAccounts();
