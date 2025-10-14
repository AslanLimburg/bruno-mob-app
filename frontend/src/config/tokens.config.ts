export interface TokenConfig {
  symbol: string
  address: string
  decimals: number
  name: string
}

export const TOKENS: Record<string, TokenConfig> = {
  BRT: {
    symbol: 'BRT',
    name: 'Bruno Token',
    address: '0x0000000000000000000000000000000000000000', // ← ВСТАВИТЬ РЕАЛЬНЫЙ АДРЕС BRT
    decimals: 18,
  },
  BRTC: {
    symbol: 'BRTC',
    name: 'Bruno Token Coin',
    address: '0x0000000000000000000000000000000000000000', // ← ВСТАВИТЬ РЕАЛЬНЫЙ АДРЕС BRTC
    decimals: 18,
  },
}

export const CHAIN_CONFIG = {
  BSC_MAINNET: {
    chainId: 56,
    chainName: 'Binance Smart Chain',
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com'],
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  BSC_TESTNET: {
    chainId: 97,
    chainName: 'BSC Testnet',
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18,
    },
  },
}

// Текущая сеть (поменять на MAINNET для продакшена)
export const CURRENT_CHAIN = CHAIN_CONFIG.BSC_TESTNET