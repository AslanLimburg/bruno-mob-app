const { query, transaction } = require('../config/database');

class ActivationController {
  // Активация кода (Coupon)
  static async redeemCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.userId; // из JWT middleware

      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Activation code required' 
        });
      }

      // Проверяем код в транзакции
      const result = await transaction(async (client) => {
        // Находим код
        const codeResult = await client.query(
          `SELECT * FROM activation_codes 
           WHERE code = $1 AND status = 'sent' AND expires_at > NOW()
           FOR UPDATE`,
          [code.trim().toUpperCase()]
        );

        if (codeResult.rows.length === 0) {
          throw new Error('Invalid, expired, or already used code');
        }

        const activationCode = codeResult.rows[0];

        // Помечаем код как использованный
        await client.query(
          `UPDATE activation_codes 
           SET status = 'activated', 
               activated_by_user_id = $1, 
               activated_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [userId, activationCode.id]
        );

        // Зачисляем BRT на баланс пользователя
        await client.query(
          `UPDATE user_balances 
           SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND crypto = 'BRT'`,
          [activationCode.amount_brt, userId]
        );

        // Создаём транзакцию в системе
        await client.query(
          `INSERT INTO transactions 
           (from_user_id, to_user_id, crypto, amount, type, status, metadata)
           VALUES (1, $1, 'BRT', $2, 'activation_code', 'completed', $3::jsonb)`,
          [
            userId, 
            activationCode.amount_brt,
            JSON.stringify({
              activation_code: code,
              amount_usd: parseFloat(activationCode.amount_usd),
              amount_brt: parseFloat(activationCode.amount_brt)
            })
          ]
        );

        return {
          brtAmount: parseFloat(activationCode.amount_brt),
          usdAmount: parseFloat(activationCode.amount_usd)
        };
      });

      res.json({ 
        success: true, 
        message: `Successfully activated! ${result.brtAmount} BRT added to your account`,
        data: result
      });
    } catch (error) {
      console.error('Redeem code error:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Failed to activate code' 
      });
    }
  }

  // Получить свои коды (купленные)
  static async getMyCodes(req, res) {
    try {
      const userId = req.userId;

      // Получаем email пользователя
      const userResult = await query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const userEmail = userResult.rows[0].email;

      // Получаем все коды купленные этим email
      const result = await query(
        `SELECT 
          code,
          amount_usd,
          amount_brt,
          status,
          activated_at,
          expires_at,
          created_at
         FROM activation_codes
         WHERE buyer_email = $1
         ORDER BY created_at DESC`,
        [userEmail]
      );

      res.json({ 
        success: true, 
        data: result.rows.map(row => ({
          code: row.code,
          amountUSD: parseFloat(row.amount_usd),
          amountBRT: parseFloat(row.amount_brt),
          status: row.status,
          activatedAt: row.activated_at,
          expiresAt: row.expires_at,
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      console.error('Get my codes error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve codes' 
      });
    }
  }

  // Проверить код (без активации)
  static async checkCode(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Code required' 
        });
      }

      const result = await query(
        `SELECT 
          code,
          amount_usd,
          amount_brt,
          status,
          expires_at
         FROM activation_codes
         WHERE code = $1`,
        [code.trim().toUpperCase()]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Code not found' 
        });
      }

      const codeData = result.rows[0];

      // Проверяем статус
      let isValid = false;
      let message = '';

      if (codeData.status === 'activated') {
        message = 'Code already used';
      } else if (new Date(codeData.expires_at) < new Date()) {
        message = 'Code expired';
      } else if (codeData.status === 'sent') {
        isValid = true;
        message = 'Code is valid';
      } else {
        message = 'Code not available';
      }

      res.json({ 
        success: true, 
        data: {
          code: codeData.code,
          amountUSD: parseFloat(codeData.amount_usd),
          amountBRT: parseFloat(codeData.amount_brt),
          status: codeData.status,
          isValid: isValid,
          message: message,
          expiresAt: codeData.expires_at
        }
      });
    } catch (error) {
      console.error('Check code error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check code' 
      });
    }
  }
}

module.exports = ActivationController;
