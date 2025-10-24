const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const TOKENS = {
  USDT_BSC: {
    symbol: 'USDT',
    name: 'Tether USD (BEP-20)',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    chain: 'BSC',
  },
  USDC_ETH: {
    symbol: 'USDC',
    name: 'USD Coin (ERC-20)',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chain: 'ETHEREUM',
  },
  USDT_TRC20: {
    symbol: 'USDT',
    name: 'Tether USD (TRC-20)',
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    chain: 'TRON',
  },
  TRX: {
    symbol: 'TRX',
    name: 'Tronix',
    address: null,
    decimals: 6,
    chain: 'TRON',
  },
  BRTC: {
    symbol: 'BRTC',
    name: 'Bruno Token Coin (BEP-20)',
    address: '0x0000000000000000000000000000000000000000', // ⚠️ Заменить после деплоя!
    decimals: 18,
    chain: 'BSC',
  },
};

module.exports = {
  ERC20_ABI,
  TOKENS,
};