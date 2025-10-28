import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectMetaMask, openMetaMaskMobile, checkMetaMaskInstalled as checkMetaMask, isMobileDevice } from '../utils/metamaskHelper';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return checkMetaMask();
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Try to connect using helper
      const result = await connectMetaMask();
      
      if (result.redirectToMetaMask) {
        // Mobile device - opening MetaMask app
        setError('Please complete the connection in MetaMask app');
        setIsConnecting(false);
        return;
      }

      if (!result.success) {
        throw new Error('Failed to connect MetaMask');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(userAddress);
      setChainId(Number(network.chainId));

      // Save to backend
      await saveWalletToBackend(userAddress);

      console.log('✅ Wallet connected:', userAddress);
    } catch (err) {
      console.error('❌ Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  };

  // Save wallet address to backend
  const saveWalletToBackend = async (walletAddress) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/user/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        console.error('Failed to save wallet to backend');
      }
    } catch (err) {
      console.error('Error saving wallet:', err);
    }
  };

  // Switch network
  const switchNetwork = async (targetChainId) => {
    if (!isMetaMaskInstalled()) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (err) {
      console.error('Error switching network:', err);
      setError(err.message || 'Failed to switch network');
    }
  };

  // Listen to account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== address) {
        connectWallet();
      }
    };

    const handleChainChanged = (chainId) => {
      setChainId(Number(chainId));
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (err) {
        console.error('Auto-connect error:', err);
      }
    };

    autoConnect();
  }, []);

  const value = {
    address,
    provider,
    signer,
    chainId,
    isConnecting,
    error,
    isConnected: !!address,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};