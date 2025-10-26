import React from 'react';
import './CryptoBalances.css';

const CryptoBalances = ({ balances }) => {
  // Определяем только 4 криптовалюты
  const cryptoList = [
    {
      id: 'USDT-BEP20',
      name: 'USDT',
      network: 'BEP-20',
      icon: '💵',
      balance: balances?.['USDT-BEP20'] || 0
    },
    {
      id: 'USDC-ERC20',
      name: 'USDC',
      network: 'ERC-20',
      icon: '💎',
      balance: balances?.['USDC-ERC20'] || 0
    },
    {
      id: 'BRTC',
      name: 'BRTC',
      network: 'BEP-20',
      icon: '🪙',
      balance: balances?.BRTC || 0
    },
    {
      id: 'BRT',
      name: 'BRT',
      network: 'Bruno System',
      icon: '⭐',
      balance: balances?.BRT || 0
    }
  ];

  // Расчет Total Balance в USD (1 BRT = 1 USD)
  const calculateTotalUSD = () => {
    return cryptoList.reduce((total, crypto) => {
      // Все криптовалюты считаем по курсу 1:1 USD
      return total + (crypto.balance || 0);
    }, 0);
  };

  const totalBalanceUSD = calculateTotalUSD();

  return (
    <div className="crypto-balances-container">
      {/* Total Balance */}
      <div className="total-balance-header">
        <span className="total-balance-label">Total Balance</span>
        <span className="total-balance-amount">${totalBalanceUSD.toFixed(2)} USD</span>
      </div>

      {/* Crypto List - строчный список */}
      <div className="crypto-list">
        {cryptoList.map((crypto) => (
          <div key={crypto.id} className="crypto-item">
            <div className="crypto-icon">{crypto.icon}</div>
            <div className="crypto-info">
              <div className="crypto-name-network">
                <span className="crypto-name">{crypto.name}</span>
                <span className="crypto-network">{crypto.network}</span>
              </div>
              <div className="crypto-balance">
                {crypto.balance.toFixed(5)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoBalances;