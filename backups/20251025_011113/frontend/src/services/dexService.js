// DexScreener API Service for BRTC Token
// Path: frontend/src/services/dexService.js

import axios from 'axios';

// Замените на реальный адрес BRTC токена после деплоя
const BRTC_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEX_SCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

const dexService = {
  /**
   * Получить актуальные данные BRTC токена с DEX
   */
  async getBRTCData() {
    try {
      const response = await axios.get(`${DEX_SCREENER_API}/${BRTC_TOKEN_ADDRESS}`, {
        timeout: 10000
      });

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Берем первую (основную) торговую пару
        const mainPair = response.data.pairs[0];
        
        return {
          success: true,
          data: {
            price: parseFloat(mainPair.priceUsd) || 0,
            priceChange24h: mainPair.priceChange?.h24 || 0,
            volume24h: mainPair.volume?.h24 || 0,
            liquidity: mainPair.liquidity?.usd || 0,
            marketCap: mainPair.marketCap || 0,
            fdv: mainPair.fdv || 0,
            pairAddress: mainPair.pairAddress,
            dexId: mainPair.dexId,
            url: mainPair.url,
            // Дополнительные данные
            priceNative: mainPair.priceNative,
            txns24h: mainPair.txns?.h24,
            holders: mainPair.info?.holders || null
          }
        };
      }

      // Если данных нет (токен еще не на DEX)
      return {
        success: false,
        message: 'Token not listed on DEX yet',
        data: null
      };
    } catch (error) {
      console.error('Error fetching BRTC DEX data:', error.message);
      
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
  },

  /**
   * Форматирование больших чисел (для отображения)
   */
  formatNumber(num) {
    if (!num) return '0';
    
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    
    return `$${num.toFixed(2)}`;
  },

  /**
   * Форматирование процентов
   */
  formatPercentage(percent) {
    if (!percent) return '0%';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  },

  /**
   * Проверка, положительное ли изменение цены
   */
  isPriceChangePositive(change) {
    return change > 0;
  }
};

export default dexService;
