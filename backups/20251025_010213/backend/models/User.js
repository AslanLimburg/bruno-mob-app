const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  static async create({ email, password, name, referralCode = null }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const userReferralCode = crypto.randomBytes(8).toString('hex');

    return transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name, referral_code, referred_by)
         VALUES ($1, $2, $3, $4, (SELECT id FROM users WHERE referral_code = $5))
         RETURNING id, email, name, referral_code, created_at`,
        [email, passwordHash, name, userReferralCode, referralCode]
      );

      const user = userResult.rows[0];

      // Создать балансы для всех криптовалют
      const cryptos = ['BRT', 'BRTC', 'USDT', 'USDC', 'ETH', 'BTC', 'TRX'];
      for (const crypto of cryptos) {
        await client.query(
          `INSERT INTO user_balances (user_id, crypto, balance) VALUES ($1, $2, 0)`,
          [user.id, crypto]
        );
      }

      // ✅ ИЗМЕНЕНО: Welcome bonus теперь из treasury
      const treasuryResult = await client.query(
        `SELECT id FROM users WHERE email = 'treasury@brunotoken.com'`
      );
      
      if (treasuryResult.rows.length > 0) {
        const treasuryId = treasuryResult.rows[0].id;
        
        // Создать транзакцию welcome bonus
        await client.query(
          `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
           VALUES ($1, $2, 'BRT', 0.02, 'welcome_bonus', 'completed')`,
          [treasuryId, user.id]
        );

        // Списать с treasury
        await client.query(
          `UPDATE user_balances SET balance = balance - 0.02 
           WHERE user_id = $1 AND crypto = 'BRT'`,
          [treasuryId]
        );
        
        // Начислить новому пользователю
        await client.query(
          `UPDATE user_balances SET balance = balance + 0.02 
           WHERE user_id = $1 AND crypto = 'BRT'`,
          [user.id]
        );
        
        console.log(`✅ Welcome bonus 0.02 BRT credited from treasury to user ${user.id}`);
      }

      // ✅ ИЗМЕНЕНО: Referral signup bonus теперь из treasury
      if (referralCode) {
        const referrerResult = await client.query(
          `SELECT id, membership_tier FROM users WHERE referral_code = $1`,
          [referralCode]
        );

        if (referrerResult.rows.length > 0) {
          const referrer = referrerResult.rows[0];
          const tiers = {
            'GS-I': 0.88, 
            'GS-II': 4.98, 
            'GS-III': 34.98, 
            'GS-IV': 61.48
          };
          const commission = tiers[referrer.membership_tier] || 0.88; // Default GS-I

          if (commission > 0 && treasuryResult.rows.length > 0) {
            const treasuryId = treasuryResult.rows[0].id;
            
            // Создать транзакцию referral signup bonus
            await client.query(
              `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
               VALUES ($1, $2, 'BRT', $3, 'referral_signup_bonus', 'completed')`,
              [treasuryId, referrer.id, commission]
            );
            
            // Списать с treasury
            await client.query(
              `UPDATE user_balances SET balance = balance - $1 
               WHERE user_id = $2 AND crypto = 'BRT'`,
              [commission, treasuryId]
            );
            
            // Начислить рефереру
            await client.query(
              `UPDATE user_balances SET balance = balance + $1 
               WHERE user_id = $2 AND crypto = 'BRT'`,
              [commission, referrer.id]
            );
            
            console.log(`✅ Referral signup bonus ${commission} BRT credited from treasury to referrer ${referrer.id}`);
          }
        }
      }

      return user;
    });
  }

  static async findByEmail(email) {
    console.log('🔍 Searching for email:', email, 'Type:', typeof email);
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    console.log('🔍 Query result rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('🔍 User found:', result.rows[0].email);
    } else {
      console.log('🔍 No user found with email:', email);
    }
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  static async updateLastLogin(userId) {
    await query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
  }

  static async verifyEmail(userId) {
    await query(`UPDATE users SET email_verified = true WHERE id = $1`, [userId]);
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
  }

  static async getBalances(userId) {
    const result = await query(`SELECT crypto, balance FROM user_balances WHERE user_id = $1`, [userId]);
    return result.rows;
  }
}

module.exports = User;