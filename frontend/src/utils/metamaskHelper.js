/**
 * MetaMask Connection Helper for Mobile Apps
 * Supports both web extension and mobile app deep links
 */

export const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor;
};

/**
 * Открыть MetaMask в мобильном приложении
 */
export const openMetaMaskMobile = () => {
  const userAgent = navigator.userAgent;
  
  // MetaMask deep link format
  const metamaskUrl = 'https://metamask.app.link/dapp/' + encodeURIComponent(window.location.href);
  
  if (/Android/i.test(userAgent)) {
    // Android: Попробуем открыть через Intent
    window.location.href = `intent://metamask.app.link/dapp/${encodeURIComponent(window.location.href)}#Intent;scheme=https;end`;
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    // iOS: Universal Link или Custom URL Scheme
    window.location.href = metamaskUrl;
  } else {
    // Fallback: открыть в браузере
    window.open(metamaskUrl, '_blank');
  }
};

/**
 * Проверить установлен ли MetaMask
 */
export const checkMetaMaskInstalled = () => {
  // Проверка через extension API
  if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
    return true;
  }
  
  // Проверка в мобильном приложении
  if (isMobileDevice()) {
    // В мобильном приложении MetaMask может быть доступен через deep link
    return true; // Предполагаем что доступен через deep link
  }
  
  return false;
};

/**
 * Подключиться к MetaMask (с поддержкой мобильных)
 */
export const connectMetaMask = async () => {
  try {
    // Проверка расширения в браузере
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return {
        success: true,
        accounts,
        provider: window.ethereum
      };
    }
    
    // Мобильное устройство - открываем MetaMask
    if (isMobileDevice()) {
      openMetaMaskMobile();
      return {
        success: false,
        redirectToMetaMask: true,
        message: 'Redirecting to MetaMask app...'
      };
    }
    
    // MetaMask не установлен
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    
  } catch (error) {
    console.error('Error connecting MetaMask:', error);
    throw error;
  }
};

/**
 * Отправить транзакцию через MetaMask
 */
export const sendTransaction = async (from, to, value, data = '0x') => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  const transactionParameters = {
    from,
    to,
    value,
    data
  };
  
  try {
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters]
    });
    
    return txHash;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};

/**
 * Подписать сообщение через MetaMask
 */
export const signMessage = async (message, account) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, account]
    });
    
    return signature;
  } catch (error) {
    console.error('Sign message failed:', error);
    throw error;
  }
};

/**
 * Получить баланс через MetaMask
 */
export const getBalance = async (address) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    return balance;
  } catch (error) {
    console.error('Get balance failed:', error);
    throw error;
  }
};

/**
 * Переключить сеть в MetaMask
 */
export const switchNetwork = async (chainId) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    });
  } catch (error) {
    if (error.code === 4902) {
      throw new Error('Please add the network to MetaMask first');
    }
    throw error;
  }
};

/**
 * Добавить сеть в MetaMask
 */
export const addNetwork = async (networkConfig) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig]
    });
  } catch (error) {
    console.error('Add network failed:', error);
    throw error;
  }
};

export default {
  isMobileDevice,
  isCapacitor,
  openMetaMaskMobile,
  checkMetaMaskInstalled,
  connectMetaMask,
  sendTransaction,
  signMessage,
  getBalance,
  switchNetwork,
  addNetwork
};

