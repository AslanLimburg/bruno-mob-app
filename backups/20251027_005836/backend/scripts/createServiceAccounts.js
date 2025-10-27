require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function createServiceAccounts() {
  try {
    const password = await bcrypt.hash('service-account-secure-password', 10);
    
    // 1. Главный резервный фонд / Admin
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (1, 'admin@brunotoken.com', $1, 'Admin Account', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    // 11. Gas Fee - основной аккаунт для сбора комиссий
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (11, 'gasfee@brunotoken.com', $1, 'Gas Fee Fund', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    // 17. Treasury - казначейство для выплат бонусов
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (17, 'treasury@brunotoken.com', $1, 'Treasury Fund', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    // 18. Super Admin
    await query(`
      INSERT INTO users (id, email, password_hash, name, account_status)
      VALUES (18, 'super-admin@brunotoken.com', $1, 'Super Admin', 'active')
      ON CONFLICT (id) DO NOTHING
    `, [password]);
    
    console.log('✅ Service accounts created');
    
    // Создать балансы BRT для всех системных аккаунтов
    const accounts = [1, 11, 17, 18];
    for (const userId of accounts) {
      await query(`
        INSERT INTO user_balances (user_id, crypto, balance)
        VALUES ($1, 'BRT', 0)
        ON CONFLICT (user_id, crypto) DO NOTHING
      `, [userId]);
    }
    
    console.log('✅ Service account balances created');
    console.log('📊 Created accounts:');
    console.log('   - ID 1: admin@brunotoken.com');
    console.log('   - ID 11: gasfee@brunotoken.com');
    console.log('   - ID 17: treasury@brunotoken.com');
    console.log('   - ID 18: super-admin@brunotoken.com');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createServiceAccounts();