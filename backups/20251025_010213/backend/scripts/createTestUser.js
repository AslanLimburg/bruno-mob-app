require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function createTestUser() {
  try {
    const email = 'test@test.com';
    const password = 'test1234';
    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const result = await query(
      'INSERT INTO users (email, password_hash, email_verified, referral_code) VALUES ($1, $2, $3, $4) RETURNING id, email, referral_code',
      [email, passwordHash, true, referralCode]
    );
    
    console.log('Test user created!');
    console.log('Email:', email);
    console.log('Password:', password);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
