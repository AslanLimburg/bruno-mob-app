// Token configurations for multi-chain support

export const CHAINS = {
  BSC: {
    chainId: 56,
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  TRON: {
    chainId: null,
    name: 'Tron Mainnet',
    rpcUrl: 'https://api.trongrid.io',
    blockExplorer: 'https://tronscan.org',
    nativeCurrency: {
      name: 'Tronix',
      symbol: 'TRX',
      decimals: 6,
    },
  },
};

export const TOKENS = {
  USDT_BSC: {
    symbol: 'USDT',
    name: 'Tether USD (BEP-20)',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    chainId: 56,
    chain: 'BSC',
    type: 'ERC20',
    logo: '/images/tokens/usdt.png',
  },
  USDC_ETH: {
    symbol: 'USDC',
    name: 'USD Coin (ERC-20)',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: 1,
    chain: 'ETHEREUM',
    type: 'ERC20',
    logo: '/images/tokens/usdc.png',
  },
  USDT_TRC20: {
    symbol: 'USDT',
    name: 'Tether USD (TRC-20)',
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    chainId: null,
    chain: 'TRON',
    type: 'TRC20',
    logo: '/images/tokens/usdt.png',
  },
  TRX: {
    symbol: 'TRX',
    name: 'Tronix',
    address: null,
    decimals: 6,
    chainId: null,
    chain: 'TRON',
    type: 'NATIVE',
    logo: '/images/tokens/trx.png',
  },
  BRTC: {
    symbol: 'BRTC',
    name: 'Bruno Token Coin (BEP-20)',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    chainId: 56,
    chain: 'BSC',
    type: 'ERC20',
    logo: '/images/tokens/brtc.png',
  },
};

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const formatTokenAmount = (amount, decimals) => {
  if (!amount) return '0';
  const value = parseFloat(amount) / Math.pow(10, decimals);
  return value.toFixed(4);
};

export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};