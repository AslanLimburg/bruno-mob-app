const { pool } = require('../config/database');

// Update user wallet address (MetaMask)
const updateWalletAddress = async (req, res) => {
  const userId = req.user.id;
  const { walletAddress } = req.body;

  if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address format',
    });
  }

  try {
    const existingWallet = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1 AND id != $2',
      [walletAddress.toLowerCase(), userId]
    );

    if (existingWallet.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This wallet is already connected to another account',
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET wallet_address = $1, wallet_connected = true
       WHERE id = $2 
       RETURNING id, email, wallet_address, wallet_connected`,
      [walletAddress.toLowerCase(), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      data: {
        walletAddress: result.rows[0].wallet_address,
        walletConnected: result.rows[0].wallet_connected,
      },
    });
  } catch (error) {
    console.error('Error updating wallet address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wallet address',
    });
  }
};

// Update user Tron address (TronLink)
const updateTronAddress = async (req, res) => {
  const userId = req.user.id;
  const { tronAddress } = req.body;

  if (!tronAddress || !tronAddress.match(/^T[a-zA-Z0-9]{33}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Tron address format',
    });
  }

  try {
    const existingWallet = await pool.query(
      'SELECT id FROM users WHERE tron_address = $1 AND id != $2',
      [tronAddress, userId]
    );

    if (existingWallet.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This Tron wallet is already connected to another account',
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET tron_address = $1, tron_connected = true
       WHERE id = $2 
       RETURNING id, email, tron_address, tron_connected`,
      [tronAddress, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Tron wallet connected successfully',
      data: {
        tronAddress: result.rows[0].tron_address,
        tronConnected: result.rows[0].tron_connected,
      },
    });
  } catch (error) {
    console.error('Error updating Tron address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Tron address',
    });
  }
};

// Get user wallet info
const getWalletInfo = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        wallet_address, 
        wallet_connected, 
        tron_address, 
        tron_connected 
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        walletAddress: result.rows[0].wallet_address,
        walletConnected: result.rows[0].wallet_connected,
        tronAddress: result.rows[0].tron_address,
        tronConnected: result.rows[0].tron_connected,
      },
    });
  } catch (error) {
    console.error('Error getting wallet info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet info',
    });
  }
};

// Disconnect MetaMask wallet
const disconnectWallet = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `UPDATE users 
       SET wallet_address = NULL, wallet_connected = false
       WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Wallet disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect wallet',
    });
  }
};

// Disconnect Tron wallet
const disconnectTronWallet = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `UPDATE users 
       SET tron_address = NULL, tron_connected = false
       WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Tron wallet disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Tron wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Tron wallet',
    });
  }
};

// Get user transactions
const getTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
        t.id,
        t.from_user_id,
        t.to_user_id,
        t.crypto,
        t.amount,
        t.fee,
        t.type,
        t.status,
        t.created_at,
        t.metadata,
        u1.email as from_email,
        u2.email as to_email
       FROM transactions t
       LEFT JOIN users u1 ON t.from_user_id = u1.id
       LEFT JOIN users u2 ON t.to_user_id = u2.id
       WHERE t.from_user_id = $1 OR t.to_user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
    });
  }
};

// Send crypto to another user (internal transfer)
const sendCrypto = async (req, res) => {
  const senderId = req.user.id;
  const { recipientEmail, crypto, amount } = req.body;

  // Валидация
  if (!recipientEmail || !crypto || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Recipient email, crypto and amount are required',
    });
  }

  const transferAmount = parseFloat(amount);
  const serviceFee = 0.02; // BRT
  const gasFeeAccountId = 11; // gasfee@brunotoken.com

  if (transferAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be positive',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Найти получателя
    const recipientResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [recipientEmail.toLowerCase()]
    );

    if (recipientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    const recipientId = recipientResult.rows[0].id;

    // Проверка что не отправляем себе
    if (senderId === recipientId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot send to yourself',
      });
    }

    // 2. Проверить баланс отправителя (amount + fee)
    const senderBalanceResult = await client.query(
      'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
      [senderId, crypto]
    );

    if (senderBalanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `You don't have a ${crypto} balance`,
      });
    }

    const senderBalance = parseFloat(senderBalanceResult.rows[0].balance);
    const totalDeduction = transferAmount + (crypto === 'BRT' ? serviceFee : 0);

    if (senderBalance < totalDeduction) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient ${crypto} balance`,
      });
    }

    // 3. Проверить что у получателя есть запись в user_balances
    const recipientBalanceResult = await client.query(
      'SELECT balance FROM user_balances WHERE user_id = $1 AND crypto = $2',
      [recipientId, crypto]
    );

    if (recipientBalanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Recipient doesn't have a ${crypto} wallet initialized`,
      });
    }

    // 4. Списать у отправителя
    await client.query(
      'UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
      [transferAmount, senderId, crypto]
    );

    // 5. Зачислить получателю
    await client.query(
      'UPDATE user_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
      [transferAmount, recipientId, crypto]
    );

    // 6. Создать транзакцию для основного перевода
    await client.query(
      `INSERT INTO transactions 
       (from_user_id, to_user_id, crypto, amount, type, status, metadata)
       VALUES ($1, $2, $3, $4, 'send', 'completed', $5)`,
      [senderId, recipientId, crypto, transferAmount, JSON.stringify({ 
        method: 'internal_transfer'
      })]
    );

    // 7. Если это BRT - списать и зачислить service fee
    if (crypto === 'BRT') {
      // Списать fee у отправителя
      await client.query(
        'UPDATE user_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
        [serviceFee, senderId, 'BRT']
      );

      // Зачислить fee на gasfee аккаунт
      await client.query(
        'UPDATE user_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 AND crypto = $3',
        [serviceFee, gasFeeAccountId, 'BRT']
      );

      // Создать транзакцию для fee
      await client.query(
        `INSERT INTO transactions 
         (from_user_id, to_user_id, crypto, amount, type, status, metadata)
         VALUES ($1, $2, 'BRT', $3, 'service_fee', 'completed', $4)`,
        [senderId, gasFeeAccountId, serviceFee, JSON.stringify({ 
          related_transfer: recipientEmail
        })]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully sent ${transferAmount} ${crypto} to ${recipientEmail}`,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending crypto:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send crypto',
    });
  } finally {
    client.release();
  }
};

module.exports = {
  updateWalletAddress,
  updateTronAddress,
  getWalletInfo,
  disconnectWallet,
  disconnectTronWallet,
  getTransactions,
  sendCrypto,
};