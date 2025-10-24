const { pool } = require('../config/database');
const walletManager = require('../utils/walletManager');
const coinGeckoService = require('../services/coinGeckoService');
const { TOKENS } = require('../config/tokenConfig');

/**
 * Получить курсы обмена для всех токенов
 */
const getRates = async (req, res) => {
  try {
    const rates = await coinGeckoService.getAllRates();

    // BRT всегда фиксированный курс 1 BRT = 1 USD
    rates.BRT = 1.00;

    res.json({
      success: true,
      data: rates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get exchange rates',
    });
  }
};

/**
 * Рассчитать swap
 */
const calculateSwap = async (req, res) => {
  const { fromToken, toToken, amount } = req.body;

  if (!fromToken || !toToken || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  try {
    const calculation = await coinGeckoService.calculateSwap(
      fromToken,
      toToken,
      parseFloat(amount)
    );

    res.json({
      success: true,
      data: calculation,
    });
  } catch (error) {
    console.error('Error calculating swap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate swap',
    });
  }
};

/**
 * Выполнить swap: Crypto → BRT
 * Юзер отправляет крипту на наш Treasury кошелёк, мы зачисляем BRT
 */
const swapCryptoToBRT = async (req, res) => {
  const userId = req.user.id;
  const { fromToken, amount, txHash } = req.body;

  if (!fromToken || !amount || !txHash) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Проверяем что транзакция ещё не обработана
    const existingTx = await client.query(
      'SELECT id FROM swap_transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Transaction already processed',
      });
    }

    // Рассчитываем сумму BRT (комиссия 0.5%)
    const calculation = await coinGeckoService.calculateSwap(
      fromToken,
      'BRT',
      parseFloat(amount)
    );

    const brtAmount = calculation.toAmount;
    const commission = calculation.commission;

    // Зачисляем BRT юзеру
    await client.query(
      'UPDATE users SET brt_balance = brt_balance + $1 WHERE id = $2',
      [brtAmount, userId]
    );

    // Сохраняем swap транзакцию
    const swapResult = await client.query(
      `INSERT INTO swap_transactions 
       (user_id, from_token, to_token, from_amount, to_amount, commission, tx_hash, type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [userId, fromToken, 'BRT', amount, brtAmount, commission, txHash, 'crypto_to_brt', 'completed']
    );

    // Сохраняем в резерв BRTC
    await client.query(
      `INSERT INTO brtc_reserve 
       (transaction_type, amount_received, currency_received, amount_sent, currency_sent, commission, gas_fee, profit, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      ['crypto_to_brt', amount, fromToken, brtAmount, 'BRT', commission, 0, commission]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully swapped ${amount} ${fromToken} to ${brtAmount.toFixed(8)} BRT`,
      data: swapResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error swapping crypto to BRT:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process swap',
    });
  } finally {
    client.release();
  }
};

/**
 * Выполнить swap: BRT → Crypto
 * Списываем BRT, отправляем крипту с нашего Treasury кошелька
 */
const swapBRTToCrypto = async (req, res) => {
  const userId = req.user.id;
  const { toToken, amount, recipientAddress } = req.body;

  if (!toToken || !amount || !recipientAddress) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Проверяем баланс BRT
    const userResult = await client.query(
      'SELECT brt_balance FROM users WHERE id = $1',
      [userId]
    );

    const currentBalance = parseFloat(userResult.rows[0].brt_balance);

    if (currentBalance < parseFloat(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient BRT balance',
      });
    }

    // Рассчитываем сумму крипты (комиссия 0.5%)
    const calculation = await coinGeckoService.calculateSwap(
      'BRT',
      toToken,
      parseFloat(amount)
    );

    const cryptoAmount = calculation.toAmount;
    const commission = calculation.commission;

    // Списываем BRT
    await client.query(
      'UPDATE users SET brt_balance = brt_balance - $1 WHERE id = $2',
      [amount, userId]
    );

    // Отправляем крипту с Treasury кошелька
    let txResult;
    const tokenConfig = Object.values(TOKENS).find(t => t.symbol === toToken);

    if (!tokenConfig) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Unsupported token',
      });
    }

    if (tokenConfig.chain === 'TRON') {
      if (toToken === 'TRX') {
        txResult = await walletManager.sendTRX(recipientAddress, cryptoAmount);
      } else {
        txResult = await walletManager.sendTRC20(
          tokenConfig.address,
          recipientAddress,
          cryptoAmount
        );
      }
    } else {
      txResult = await walletManager.sendERC20(
        tokenConfig.address,
        recipientAddress,
        cryptoAmount,
        tokenConfig.chain
      );
    }

    // Сохраняем swap транзакцию
    const swapResult = await client.query(
      `INSERT INTO swap_transactions 
       (user_id, from_token, to_token, from_amount, to_amount, commission, tx_hash, recipient_address, type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [userId, 'BRT', toToken, amount, cryptoAmount, commission, txResult.txHash, recipientAddress, 'brt_to_crypto', 'completed']
    );

    // Рассчитываем gas fee и прибыль
    const gasFee = txResult.gasFee || 0;
    const profit = commission - gasFee;

    await client.query(
      `INSERT INTO brtc_reserve 
       (transaction_type, amount_received, currency_received, amount_sent, currency_sent, commission, gas_fee, profit, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      ['brt_to_crypto', amount, 'BRT', cryptoAmount, toToken, commission, gasFee, profit]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully swapped ${amount} BRT to ${cryptoAmount.toFixed(8)} ${toToken}`,
      data: {
        ...swapResult.rows[0],
        txHash: txResult.txHash,
        explorerUrl: txResult.explorerUrl,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error swapping BRT to crypto:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process swap: ' + error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Выполнить swap: Crypto → Crypto (через BRTC мост)
 * Юзер отправляет crypto A на Treasury, мы отправляем crypto B юзеру
 */
const swapCryptoToCrypto = async (req, res) => {
  const userId = req.user.id;
  const { fromToken, toToken, amount, txHash, recipientAddress } = req.body;

  if (!fromToken || !toToken || !amount || !txHash || !recipientAddress) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Проверяем что транзакция ещё не обработана
    const existingTx = await client.query(
      'SELECT id FROM swap_transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Transaction already processed',
      });
    }

    // Рассчитываем сумму через BRTC мост (комиссия 0.5%)
    const calculation = await coinGeckoService.calculateSwap(
      fromToken,
      toToken,
      parseFloat(amount)
    );

    const outputAmount = calculation.toAmount;
    const commission = calculation.commission;

    // Отправляем крипту с Treasury кошелька
    let txResult;
    const tokenConfig = Object.values(TOKENS).find(t => t.symbol === toToken);

    if (!tokenConfig) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Unsupported token',
      });
    }

    if (tokenConfig.chain === 'TRON') {
      if (toToken === 'TRX') {
        txResult = await walletManager.sendTRX(recipientAddress, outputAmount);
      } else {
        txResult = await walletManager.sendTRC20(
          tokenConfig.address,
          recipientAddress,
          outputAmount
        );
      }
    } else {
      txResult = await walletManager.sendERC20(
        tokenConfig.address,
        recipientAddress,
        outputAmount,
        tokenConfig.chain
      );
    }

    // Сохраняем swap транзакцию
    const swapResult = await client.query(
      `INSERT INTO swap_transactions 
       (user_id, from_token, to_token, from_amount, to_amount, commission, tx_hash, recipient_address, type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [userId, fromToken, toToken, amount, outputAmount, commission, txHash, recipientAddress, 'crypto_to_crypto', 'completed']
    );

    // Рассчитываем gas fee и прибыль
    const gasFee = txResult.gasFee || 0;
    const profit = commission - gasFee;

    await client.query(
      `INSERT INTO brtc_reserve 
       (transaction_type, amount_received, currency_received, amount_sent, currency_sent, commission, gas_fee, profit, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      ['crypto_to_crypto', amount, fromToken, outputAmount, toToken, commission, gasFee, profit]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully swapped ${amount} ${fromToken} to ${outputAmount.toFixed(8)} ${toToken}`,
      data: {
        ...swapResult.rows[0],
        outputTxHash: txResult.txHash,
        explorerUrl: txResult.explorerUrl,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error swapping crypto to crypto:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process swap: ' + error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Обмен BRT ↔ BRTC (прямой обмен без двойной конвертации)
 */
const swapBRTandBRTC = async (req, res) => {
  const userId = req.user.id;
  const { fromToken, toToken, amount, recipientAddress } = req.body;

  // Проверка что это именно BRT ↔ BRTC
  if (!((fromToken === 'BRT' && toToken === 'BRTC') || (fromToken === 'BRTC' && toToken === 'BRT'))) {
    return res.status(400).json({
      success: false,
      message: 'This endpoint only supports BRT ↔ BRTC swaps',
    });
  }

  if (!amount) {
    return res.status(400).json({
      success: false,
      message: 'Missing amount',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const swapAmount = parseFloat(amount);
    const commission = swapAmount * 0.005; // 0.5% комиссия
    const outputAmount = swapAmount - commission;

    if (fromToken === 'BRT') {
      // BRT → BRTC: списываем BRT, отправляем BRTC с Treasury
      if (!recipientAddress) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Recipient address required for BRTC',
        });
      }

      // Проверяем баланс BRT
      const userResult = await client.query(
        'SELECT brt_balance FROM users WHERE id = $1',
        [userId]
      );

      const currentBalance = parseFloat(userResult.rows[0].brt_balance);

      if (currentBalance < swapAmount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Insufficient BRT balance',
        });
      }

      // Списываем BRT
      await client.query(
        'UPDATE users SET brt_balance = brt_balance - $1 WHERE id = $2',
        [swapAmount, userId]
      );

      // Отправляем BRTC с Treasury
      const brtcConfig = Object.values(TOKENS).find(t => t.symbol === 'BRTC');
      const txResult = await walletManager.sendERC20(
        brtcConfig.address,
        recipientAddress,
        outputAmount,
        brtcConfig.chain
      );

      // Сохраняем транзакцию
      const swapResult = await client.query(
        `INSERT INTO swap_transactions 
         (user_id, from_token, to_token, from_amount, to_amount, commission, tx_hash, recipient_address, type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [userId, 'BRT', 'BRTC', swapAmount, outputAmount, commission, txResult.txHash, recipientAddress, 'brt_to_brtc', 'completed']
      );

      const gasFee = txResult.gasFee || 0;
      const profit = commission - gasFee;

      await client.query(
        `INSERT INTO brtc_reserve 
         (transaction_type, amount_received, currency_received, amount_sent, currency_sent, commission, gas_fee, profit, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        ['brt_to_brtc', swapAmount, 'BRT', outputAmount, 'BRTC', commission, gasFee, profit]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully swapped ${swapAmount} BRT to ${outputAmount.toFixed(8)} BRTC`,
        data: {
          ...swapResult.rows[0],
          txHash: txResult.txHash,
          explorerUrl: txResult.explorerUrl,
        },
      });

    } else {
      // BRTC → BRT: принимаем BRTC (нужен txHash), зачисляем BRT
      const { txHash } = req.body;

      if (!txHash) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Transaction hash required',
        });
      }

      // Проверяем что транзакция не обработана
      const existingTx = await client.query(
        'SELECT id FROM swap_transactions WHERE tx_hash = $1',
        [txHash]
      );

      if (existingTx.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Transaction already processed',
        });
      }

      // Зачисляем BRT
      await client.query(
        'UPDATE users SET brt_balance = brt_balance + $1 WHERE id = $2',
        [outputAmount, userId]
      );

      // Сохраняем транзакцию
      const swapResult = await client.query(
        `INSERT INTO swap_transactions 
         (user_id, from_token, to_token, from_amount, to_amount, commission, tx_hash, type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING *`,
        [userId, 'BRTC', 'BRT', swapAmount, outputAmount, commission, txHash, 'brtc_to_brt', 'completed']
      );

      await client.query(
        `INSERT INTO brtc_reserve 
         (transaction_type, amount_received, currency_received, amount_sent, currency_sent, commission, gas_fee, profit, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        ['brtc_to_brt', swapAmount, 'BRTC', outputAmount, 'BRT', commission, 0, commission]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Successfully swapped ${swapAmount} BRTC to ${outputAmount.toFixed(8)} BRT`,
        data: swapResult.rows[0],
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error swapping BRT ↔ BRTC:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process swap: ' + error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Получить историю swap транзакций
 */
const getSwapHistory = async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM swap_transactions 
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
    console.error('Error getting swap history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get swap history',
    });
  }
};

module.exports = {
  getRates,
  calculateSwap,
  swapCryptoToBRT,
  swapBRTToCrypto,
  swapCryptoToCrypto,
  swapBRTandBRTC,
  getSwapHistory,
};
