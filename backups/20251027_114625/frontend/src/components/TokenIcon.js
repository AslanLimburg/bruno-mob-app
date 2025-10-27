import React from 'react';
import './TokenIcon.css';

// Конфигурация иконок токенов
const TOKEN_ICONS = {
  'BRT': '/images/tokens/BRT.png',
  'BRTC': '/images/tokens/BRTC.png',
  'USDT': '/images/tokens/USDT.svg',
  'USDT-BEP20': '/images/tokens/USDT.svg',
  'USDT-TRC20': '/images/tokens/USDT.svg',
  'USDC': '/images/tokens/USDC.svg',
  'USDC-ERC20': '/images/tokens/USDC.svg',
  'TRX': '💎',
  'ETH': '💠',
  'BNB': '🟡',
};

const TokenIcon = ({ symbol, size = 32, className = '', showBackground = true }) => {
  const icon = TOKEN_ICONS[symbol?.toUpperCase()];
  
  // Если иконка не найдена - fallback на первую букву
  if (!icon) {
    return (
      <div 
        className={`token-icon-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: showBackground ? '50%' : '0',
          background: showBackground ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
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

  // Если это путь к изображению
  return (
    <div className={`token-icon-wrapper ${className}`} style={{ width: size, height: size }}>
      <img
        src={icon}
        alt={`${symbol} icon`}
        className="token-icon-img"
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }}
        onError={(e) => {
          // Fallback если изображение не загрузилось
          e.target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'token-icon-fallback';
          fallback.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${size * 0.5}px;
          `;
          fallback.textContent = symbol?.[0]?.toUpperCase() || '?';
          e.target.parentElement.appendChild(fallback);
        }}
      />
    </div>
  );
};

export default TokenIcon;

// Helper функция для получения пути к иконке
export const getTokenIconPath = (symbol) => {
  return TOKEN_ICONS[symbol?.toUpperCase()] || null;
};

// Helper функция для получения всех доступных токенов
export const getAvailableTokens = () => {
  return Object.keys(TOKEN_ICONS).filter(key => !key.includes('-'));
};

