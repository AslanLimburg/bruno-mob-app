const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  static async create({ email, password, referralCode = null }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const userReferralCode = crypto.randomBytes(8).toString('hex');

    return transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, referral_code, referred_by)
         VALUES ($1, $2, $3, (SELECT id FROM users WHERE referral_code = $4))
         RETURNING id, email, referral_code, created_at`,
        [email, passwordHash, userReferralCode, referralCode]
      );

      const user = userResult.rows[0];

      const cryptos = ['BRT', 'BRTC', 'USDT', 'USDC', 'ETH', 'BTC', 'TRX'];
      for (const crypto of cryptos) {
        await client.query(
          `INSERT INTO user_balances (user_id, crypto, balance) VALUES ($1, $2, 0)`,
          [user.id, crypto]
        );
      }

      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
         VALUES (2, $1, 'BRT', 0.02, 'welcome_bonus', 'completed')`,
        [user.id]
      );

      await client.query(`UPDATE user_balances SET balance = balance - 0.02 WHERE user_id = 2 AND crypto = 'BRT'`);
      await client.query(`UPDATE user_balances SET balance = balance + 0.02 WHERE user_id = $1 AND crypto = 'BRT'`, [user.id]);

      if (referralCode) {
        const referrerResult = await client.query(
          `SELECT id, membership_tier FROM users WHERE referral_code = $1`,
          [referralCode]
        );

        if (referrerResult.rows.length > 0) {
          const referrer = referrerResult.rows[0];
          const tiers = {
            'GS-I': 0.88, 'GS-II': 4.98, 'GS-III': 34.98, 'GS-IV': 61.48
          };
          const commission = tiers[referrer.membership_tier] || 0;

          if (commission > 0) {
            await client.query(
              `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status)
               VALUES (1, $1, 'BRT', $2, 'referral_payout', 'completed')`,
              [referrer.id, commission]
            );
            await client.query(`UPDATE user_balances SET balance = balance - $1 WHERE user_id = 1 AND crypto = 'BRT'`, [commission]);
            await client.query(`UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2 AND crypto = 'BRT'`, [commission, 
referrer.id]);
          }
        }
      }

      return user;
    });
  }

  static async findByEmail(email) {
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
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
