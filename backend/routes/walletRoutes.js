const express = require('express');
const router = express.Router();
const { pool, query, transaction } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// POST /api/wallet/send - Отправка криптовалюты между пользователями
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { recipientEmail, crypto, amount } = req.body;
    const senderId = req.user.id;
    
    if (!recipientEmail || !crypto || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email, crypto and amount are required' 
      });
    }
    
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be greater than 0' 
      });
    }
    
    const result = await transaction(async (client) => {
      const recipientResult = await client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [recipientEmail]
      );
      
      if (recipientResult.rows.length === 0) {
        throw new Error('Recipient not found');
      }
      
      const recipientId = recipientResult.rows[0].id;
      
      if (senderId === recipientId) {
        throw new Error('Cannot send to yourself');
      }
      
      const senderBalanceResult = await client.query(
        'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2 FOR UPDATE',
        [senderId, crypto]
      );
      
      if (senderBalanceResult.rows.length === 0) {
        throw new Error(`No ${crypto} balance found`);
      }
      
      const senderBalance = parseFloat(senderBalanceResult.rows[0].balance);
      
      if (senderBalance < parseFloat(amount)) {
        throw new Error(`Insufficient ${crypto} balance`);
      }
      
      await client.query(
        'UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
        [amount, senderId, crypto]
      );
      
      await client.query(
        `INSERT INTO user_balances (user_id, crypto, balance) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id, crypto) 
         DO UPDATE SET balance = user_balances.balance + $3, updated_at = NOW()`,
        [recipientId, crypto, amount]
      );
      
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status) 
         VALUES ($1, $2, $3, $4, 'peer_transfer', 'completed')`,
        [senderId, recipientId, crypto, amount]
      );
      
      return { recipientEmail, crypto, amount };
    });
    
    res.json({ 
      success: true, 
      message: `Successfully sent ${result.amount} ${result.crypto} to ${result.recipientEmail}` 
    });
    
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET /api/wallet/transactions - Получить историю транзакций
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      `SELECT 
        t.id,
        t.from_user_id,
        t.to_user_id,
        t.crypto,
        t.amount,
        t.type,
        t.status,
        t.created_at,
        sender.email as from_email,
        sender.name as from_name,
        recipient.email as to_email,
        recipient.name as to_name
      FROM transactions t
      LEFT JOIN users sender ON t.from_user_id = sender.id
      LEFT JOIN users recipient ON t.to_user_id = recipient.id
      WHERE t.from_user_id = $1 OR t.to_user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 50`,
      [userId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;