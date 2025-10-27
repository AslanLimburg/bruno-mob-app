// Token Icons Configuration
// Иконки для отображения токенов в интерфейсе

const TOKEN_ICONS = {
  BRT: '/images/tokens/BRT.png',
  BRTC: '/images/tokens/BRTC.png',
  USDT: '/images/tokens/USDT.svg',
  USDC: '/images/tokens/USDC.svg',
  // Fallback для других токенов
  TRX: '💎',
  ETH: '💠',
  BTC: '₿',
};

// Компонент для отображения иконки токена
export const TokenIcon = ({ symbol, size = 32, className = '' }) => {
  const icon = TOKEN_ICONS[symbol?.toUpperCase()];
  
  if (!icon) {
    // Fallback - первая буква токена
    return (
      <div 
        className={`token-icon-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: size * 0.5
        }}
      >
        {symbol?.[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  // Если это emoji
  if (icon.length <= 2) {
    return (
      <span 
        className={`token-icon-emoji ${className}`}
        style={{ fontSize: size }}
      >
        {icon}
      </span>
    );
  }

  // Если это путь к файлу
  return (
    <img
      src={icon}
      alt={`${symbol} icon`}
      className={`token-icon ${className}`}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={(e) => {
        // Fallback если изображение не загрузилось
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = symbol?.[0]?.toUpperCase() || '?';
      }}
    />
  );
};

// Helper функция для получения пути к иконке
export const getTokenIcon = (symbol) => {
  return TOKEN_ICONS[symbol?.toUpperCase()] || null;
};

// Helper функция для получения всех доступных токенов
export const getAvailableTokens = () => {
  return Object.keys(TOKEN_ICONS);
};

export default TOKEN_ICONS;

