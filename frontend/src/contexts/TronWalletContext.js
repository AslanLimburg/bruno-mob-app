import React, { createContext, useContext, useState, useEffect } from 'react';

const TronWalletContext = createContext();

export const useTronWallet = () => {
  const context = useContext(TronWalletContext);
  if (!context) {
    throw new Error('useTronWallet must be used within TronWalletProvider');
  }
  return context;
};

export const TronWalletProvider = ({ children }) => {
  const [tronAddress, setTronAddress] = useState(null);
  const [tronWeb, setTronWeb] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if TronLink is installed
  const isTronLinkInstalled = () => {
    return typeof window !== 'undefined' && typeof window.tronWeb !== 'undefined';
  };

  // Connect to TronLink
  const connectTronWallet = async () => {
    console.log('🔺 Attempting to connect TronLink...');
    
    if (!isTronLinkInstalled()) {
      console.log('❌ TronLink not installed');
      setError('TronLink is not installed. Please install it to continue.');
      window.open('https://www.tronlink.org/', '_blank');
      return;
    }

    console.log('✅ TronLink is installed');
    setIsConnecting(true);
    setError(null);

    try {
      console.log('⏳ Waiting for TronLink to be ready...');
      
      // Wait for TronLink to inject tronWeb
      await new Promise((resolve) => {
        const checkTronWeb = setInterval(() => {
          console.log('🔍 Checking TronLink status:', {
            tronWeb: !!window.tronWeb,
            ready: window.tronWeb?.ready,
            defaultAddress: window.tronWeb?.defaultAddress
          });
          
          if (window.tronWeb && window.tronWeb.ready) {
            console.log('✅ TronLink is ready!');
            clearInterval(checkTronWeb);
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          console.log('⏰ TronLink timeout reached');
          clearInterval(checkTronWeb);
          resolve();
        }, 10000);
      });

      console.log('🔍 Final TronLink check:', {
        tronWeb: !!window.tronWeb,
        ready: window.tronWeb?.ready,
        defaultAddress: window.tronWeb?.defaultAddress
      });

      if (!window.tronWeb || !window.tronWeb.ready) {
        throw new Error('TronLink is not ready. Please unlock TronLink and try again.');
      }

      // Request account access
      const tronWebInstance = window.tronWeb;
      const address = tronWebInstance.defaultAddress.base58;

      console.log('📍 TronLink address:', address);

      if (!address) {
        throw new Error('No Tron address found. Please unlock TronLink.');
      }

      setTronWeb(tronWebInstance);
      setTronAddress(address);

      // Save to backend
      await saveTronAddressToBackend(address);

      console.log('✅ TronLink connected successfully:', address);
    } catch (err) {
      console.error('❌ Error connecting TronLink:', err);
      setError(err.message || 'Failed to connect TronLink');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Tron wallet
  const disconnectTronWallet = () => {
    setTronAddress(null);
    setTronWeb(null);
    setError(null);
  };

  // Save Tron address to backend
  const saveTronAddressToBackend = async (address) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/user/tron-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tronAddress: address }),
      });

      if (!response.ok) {
        console.error('Failed to save Tron address to backend');
      }
    } catch (err) {
      console.error('Error saving Tron address:', err);
    }
  };


  // Get TRC-20 token balance
  const getTrc20Balance = async (address, contractAddress) => {
    if (!tronWeb || !address) return '0';

    try {
      const contract = await tronWeb.contract().at(contractAddress);
      const balance = await contract.balanceOf(address).call();
      const decimals = await contract.decimals().call();
      
      // Convert balance
      const balanceNumber = balance.toString();
      const divisor = Math.pow(10, decimals);
      return (balanceNumber / divisor).toFixed(4);
    } catch (error) {
      console.error('Error getting TRC-20 balance:', error);
      return '0';
    }
  };

  // Listen to account changes
  useEffect(() => {
    if (!isTronLinkInstalled()) return;

    const handleAccountChange = () => {
      if (window.tronWeb && window.tronWeb.ready) {
        const newAddress = window.tronWeb.defaultAddress.base58;
        if (newAddress && newAddress !== tronAddress) {
          connectTronWallet();
        } else if (!newAddress && tronAddress) {
          disconnectTronWallet();
        }
      }
    };

    // Check for account changes every 2 seconds
    const interval = setInterval(handleAccountChange, 2000);

    return () => clearInterval(interval);
  }, [tronAddress]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isTronLinkInstalled()) return;

      try {
        if (window.tronWeb && window.tronWeb.ready) {
          const address = window.tronWeb.defaultAddress.base58;
          if (address) {
            await connectTronWallet();
          }
        }
      } catch (err) {
        console.error('Auto-connect error:', err);
      }
    };

    // Wait a bit for TronLink to initialize
    setTimeout(autoConnect, 1000);
  }, []);

  const value = {
    tronAddress,
    tronWeb,
    isConnecting,
    error,
    isConnected: !!tronAddress,
    isTronLinkInstalled: isTronLinkInstalled(),
    connectTronWallet,
    disconnectTronWallet,
    getTrc20Balance,
  };

  return <TronWalletContext.Provider value={value}>{children}</TronWalletContext.Provider>;
};