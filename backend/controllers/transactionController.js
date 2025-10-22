const { pool } = require('../config/database');

// Save crypto transaction (on-chain)
const saveCryptoTransaction = async (req, res) => {
  const userId = req.user.id;
  const { type, token, amount, recipientAddress, txHash, chain, status } = req.body;

  if (!type || !token || !amount || !txHash || !chain) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  try {
    const existingTx = await pool.query(
      'SELECT id FROM crypto_transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (existingTx.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction already recorded',
      });
    }

    const result = await pool.query(
      `INSERT INTO crypto_transactions 
       (user_id, type, token, amount, recipient_address, tx_hash, chain, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [userId, type, token, amount, recipientAddress, txHash, chain, status || 'pending']
    );

    res.json({
      success: true,
      message: 'Transaction saved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error saving crypto transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save transaction',
    });
  }
};

// Get user's crypto transactions
const getCryptoTransactions = async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM crypto_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error getting crypto transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
    });
  }
};

// Get transaction by hash
const getTransactionByHash = async (req, res) => {
  const userId = req.user.id;
  const { txHash } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM crypto_transactions WHERE user_id = $1 AND tx_hash = $2',
      [userId, txHash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
    });
  }
};

// Update transaction status
const updateTransactionStatus = async (req, res) => {
  const userId = req.user.id;
  const { txHash } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE crypto_transactions 
       SET status = $1, updated_at = NOW() 
       WHERE user_id = $2 AND tx_hash = $3 
       RETURNING *`,
      [status, userId, txHash]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      message: 'Transaction status updated',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
    });
  }
};

module.exports = {
  saveCryptoTransaction,
  getCryptoTransactions,
  getTransactionByHash,
  updateTransactionStatus,
};