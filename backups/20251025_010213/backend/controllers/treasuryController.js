const { pool } = require('../config/database');
const walletManager = require('../utils/walletManager');
const coinGeckoService = require('../services/coinGeckoService');

/**
 * Получить адреса treasury кошельков
 */
const getTreasuryAddresses = async (req, res) => {
  try {
    const metamaskAddress = walletManager.getTreasuryAddress('METAMASK');
    const tronlinkAddress = walletManager.getTreasuryAddress('TRONLINK');

    res.json({
      success: true,
      data: {
        metamask: metamaskAddress,
        tronlink: tronlinkAddress,
      },
    });
  } catch (error) {
    console.error('Error getting treasury addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get treasury addresses',
    });
  }
};

/**
 * Получить баланс treasury кошельков
 */
const getTreasuryBalances = async (req, res) => {
  try {
    const { TOKENS } = require('../config/tokenConfig');
    const metamaskAddress = walletManager.getTreasuryAddress('METAMASK');
    const tronlinkAddress = walletManager.getTreasuryAddress('TRONLINK');

    const balances = {
      metamask: {},
      tronlink: {},
    };

    // Проверяем балансы EVM токенов
    for (const [key, token] of Object.entries(TOKENS)) {
      if (token.chain === 'BSC' || token.chain === 'ETHEREUM') {
        const balance = await walletManager.getTokenBalance(
          token.address,
          metamaskAddress,
          token.chain
        );
        balances.metamask[token.symbol] = balance;
      }
    }

    // Проверяем балансы Tron токенов
    for (const [key, token] of Object.entries(TOKENS)) {
      if (token.chain === 'TRON') {
        if (token.symbol === 'TRX') {
          // Нативный TRX баланс
          const tronWeb = walletManager.getTronWallet();
          const balance = await tronWeb.trx.getBalance(tronlinkAddress);
          balances.tronlink.TRX = balance / 1000000;
        } else {
          // TRC20 токены
          const balance = await walletManager.getTokenBalance(
            token.address,
            tronlinkAddress,
            'TRON'
          );
          balances.tronlink[token.symbol] = balance;
        }
      }
    }

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error('Error getting treasury balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get treasury balances',
    });
  }
};

/**
 * Получить резерв BRTC (накопленная прибыль)
 */
const getBRTCReserve = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        SUM(profit) as total_profit,
        SUM(CASE WHEN currency_received = 'USD' OR currency_received = 'USDT' OR currency_received = 'USDC' THEN profit ELSE 0 END) as usd_reserve,
        COUNT(*) as total_transactions
      FROM brtc_reserve`
    );

    const reserve = result.rows[0];

    res.json({
      success: true,
      data: {
        totalProfit: parseFloat(reserve.total_profit) || 0,
        usdReserve: parseFloat(reserve.usd_reserve) || 0,
        totalTransactions: parseInt(reserve.total_transactions) || 0,
      },
    });
  } catch (error) {
    console.error('Error getting BRTC reserve:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get BRTC reserve',
    });
  }
};

/**
 * Получить текущую цену BRTC
 */
const getBRTCPrice = async (req, res) => {
  try {
    const price = await coinGeckoService.getBRTCPrice();

    res.json({
      success: true,
      data: {
        price,
        currency: 'USD',
        lastUpdate: new Date(),
      },
    });
  } catch (error) {
    console.error('Error getting BRTC price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get BRTC price',
    });
  }
};

/**
 * Получить все курсы токенов
 */
const getAllPrices = async (req, res) => {
  try {
    const prices = await coinGeckoService.getAllPrices();

    res.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error('Error getting all prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prices',
    });
  }
};

module.exports = {
  getTreasuryAddresses,
  getTreasuryBalances,
  getBRTCReserve,
  getBRTCPrice,
  getAllPrices,
};