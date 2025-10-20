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
    
    // Преобразуем amount в число сразу
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be a valid number greater than 0' 
      });
    }
    
const result = await transaction(async (client) => {
  // ОТЛАДКА: что пришло в запрос
  console.log('🔍 DEBUG SEND REQUEST:');
  console.log('  Sender ID (from token):', senderId);
  console.log('  Sender Email (from token):', req.user.email);
  console.log('  Recipient Email (from form):', recipientEmail);
  console.log('  Amount:', numericAmount);
  console.log('  Crypto:', crypto);
  
  // Найти получателя
  const recipientResult = await client.query(
    'SELECT id, email FROM users WHERE email = $1',
    [recipientEmail]
  );
  
  console.log('🔍 RECIPIENT QUERY RESULT:', recipientResult.rows);
  
  if (recipientResult.rows.length === 0) {
    throw new Error('Recipient not found');
  }
  
  const recipientId = recipientResult.rows[0].id;
  
  // ОТЛАДКА: сравнение ID
  console.log('🔍 ID COMPARISON:');
  console.log('  Sender ID:', senderId, typeof senderId);
  console.log('  Recipient ID:', recipientId, typeof recipientId);
  console.log('  Are equal?:', senderId === recipientId);
  console.log('  Strict equal?:', senderId === recipientId);
  console.log('  Loose equal?:', senderId == recipientId);
  
  if (senderId === recipientId) {
    throw new Error('Cannot send to yourself');
  }
      
      // Получить баланс отправителя с блокировкой
      const senderBalanceResult = await client.query(
        'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2 FOR UPDATE',
        [senderId, crypto]
      );
      
      if (senderBalanceResult.rows.length === 0) {
        throw new Error(`No ${crypto} balance found`);
      }
      
      const senderBalance = parseFloat(senderBalanceResult.rows[0].balance);
      
      // Рассчитать gas fee (0.02 BRT только для BRT переводов)
      const gasFee = crypto === 'BRT' ? 0.02 : 0;
      const totalDeduction = numericAmount + gasFee;
      
      if (senderBalance < totalDeduction) {
        throw new Error(`Insufficient ${crypto} balance. Need ${totalDeduction.toFixed(2)} (${numericAmount} + ${gasFee} gas fee)`);
      }
      
      // 1. Списать amount + gas fee с отправителя
      await client.query(
        'UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
        [totalDeduction, senderId, crypto]
      );
      
      console.log(`✅ Deducted ${totalDeduction} ${crypto} from sender ${senderId}`);
      
      // 2. Зачислить amount получателю (БЕЗ gas fee) - ИСПРАВЛЕНО!
      const recipientUpdateResult = await client.query(
        `INSERT INTO user_balances (user_id, crypto, balance, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         ON CONFLICT (user_id, crypto) 
         DO UPDATE SET 
           balance = user_balances.balance + EXCLUDED.balance, 
           updated_at = NOW()
         RETURNING balance`,
        [recipientId, crypto, numericAmount]
      );
      
      console.log(`✅ Credited ${numericAmount} ${crypto} to recipient ${recipientId}, new balance: ${recipientUpdateResult.rows[0].balance}`);
      
      // 3. Записать основную транзакцию peer_transfer
      await client.query(
        `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, created_at) 
         VALUES ($1, $2, $3, $4, 'peer_transfer', 'completed', NOW())`,
        [senderId, recipientId, crypto, numericAmount]
      );
      
      console.log(`✅ Recorded peer_transfer transaction`);
      
      // 4. Если есть gas fee - начислить на gasfee аккаунт
      if (gasFee > 0) {
        const gasFeeAccountResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          ['gasfee@brunotoken.com']
        );
        
        if (gasFeeAccountResult.rows.length > 0) {
          const gasFeeAccountId = gasFeeAccountResult.rows[0].id;
          
          // Начислить gas fee на gasfee аккаунт
          await client.query(
            `INSERT INTO user_balances (user_id, crypto, balance, created_at, updated_at) 
             VALUES ($1, $2, $3, NOW(), NOW()) 
             ON CONFLICT (user_id, crypto) 
             DO UPDATE SET 
               balance = user_balances.balance + EXCLUDED.balance, 
               updated_at = NOW()`,
            [gasFeeAccountId, crypto, gasFee]
          );
          
          console.log(`✅ Credited ${gasFee} ${crypto} gas fee to gasfee account`);
          
          // Записать транзакцию gas_fee
          await client.query(
            `INSERT INTO transactions (from_user_id, to_user_id, crypto, amount, type, status, created_at) 
             VALUES ($1, $2, $3, $4, 'gas_fee', 'completed', NOW())`,
            [senderId, gasFeeAccountId, crypto, gasFee]
          );
          
          console.log(`✅ Recorded gas_fee transaction`);
        }
      }
      
      return { recipientEmail, crypto, amount: numericAmount, gasFee };
    });
    
    res.json({ 
      success: true, 
      message: `Successfully sent ${result.amount} ${result.crypto} to ${result.recipientEmail}${result.gasFee > 0 ? ` (+ ${result.gasFee} ${result.crypto} gas fee)` : ''}` 
    });
    
  } catch (error) {
    console.error('❌ Send error:', error);
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