const axios = require('axios');

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.cache = {
      prices: {},
      lastUpdate: null,
    };
    this.cacheTimeout = 60000; // 1 минута
  }

  /**
   * Получить цену BRTC в USD
   * @returns {number} Цена BRTC в USD
   */
  async getBRTCPrice() {
    try {
      // Проверяем кэш
      if (this.isCacheValid()) {
        return this.cache.prices.brtc || 0.01; // Default 0.01 если нет данных
      }

      // Запрос к CoinGecko API
      // ⚠️ После листинга на CoinGecko заменить на реальный ID токена
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: 'bruno-token-coin', // ⚠️ Заменить после листинга!
          vs_currencies: 'usd',
        },
        timeout: 5000,
      });

      const price = response.data['bruno-token-coin']?.usd || 0.01;

      // Обновляем кэш
      this.cache.prices.brtc = price;
      this.cache.lastUpdate = Date.now();

      return price;
    } catch (error) {
      console.error('CoinGecko API error:', error.message);
      
      // Возвращаем кэшированную цену или default
      return this.cache.prices.brtc || 0.01;
    }
  }

  /**
   * Получить курсы всех поддерживаемых токенов
   */
  async getAllPrices() {
    try {
      const brtcPrice = await this.getBRTCPrice();

      return {
        BRT: 1.00, // Off-chain, всегда $1
        BRTC: brtcPrice, // On-chain, динамический
        USDT: 1.00,
        USDC: 1.00,
        TRX: await this.getTRXPrice(),
      };
    } catch (error) {
      console.error('Error getting all prices:', error);
      return {
        BRT: 1.00,
        BRTC: 0.01,
        USDT: 1.00,
        USDC: 1.00,
        TRX: 0.10,
      };
    }
  }

  /**
   * Получить цену TRX
   */
  async getTRXPrice() {
    try {
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: 'tron',
          vs_currencies: 'usd',
        },
        timeout: 5000,
      });

      return response.data.tron?.usd || 0.10;
    } catch (error) {
      console.error('Error getting TRX price:', error);
      return 0.10;
    }
  }

  /**
   * Проверка валидности кэша
   */
  isCacheValid() {
    if (!this.cache.lastUpdate) return false;
    return Date.now() - this.cache.lastUpdate < this.cacheTimeout;
  }

  /**
   * Рассчитать swap (конвертация с комиссией)
   * @param {string} fromToken - Исходный токен
   * @param {string} toToken - Целевой токен
   * @param {number} amount - Сумма
   * @returns {object} Результат расчёта
   */
  async calculateSwap(fromToken, toToken, amount) {
    try {
      const prices = await this.getAllPrices();
      const commission = 0.005; // 0.5%

      const fromPrice = prices[fromToken] || 1;
      const toPrice = prices[toToken] || 1;

      // Конвертируем в USD
      const usdAmount = amount * fromPrice;

      // Применяем комиссию
      const afterCommission = usdAmount * (1 - commission);

      // Конвертируем в целевой токен
      const toAmount = afterCommission / toPrice;

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: toAmount,
        fromPrice,
        toPrice,
        commission: usdAmount * commission,
        commissionPercent: commission * 100,
      };
    } catch (error) {
      console.error('Error calculating swap:', error);
      throw error;
    }
  }
}

module.exports = new CoinGeckoService();