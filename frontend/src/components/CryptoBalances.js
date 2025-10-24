import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import { useTronWallet } from '../contexts/TronWalletContext';
import { TOKENS, ERC20_ABI, formatTokenAmount } from '../config/tokens.config';
import './CryptoBalances.css';

const CryptoBalances = () => {
  const { address, provider, chainId, connectWallet, disconnectWallet, isConnected } = useWallet();
  const { 
    tronAddress, 
    tronWeb, 
    connectTronWallet, 
    disconnectTronWallet, 
    isConnected: isTronConnected,
    getTrc20Balance 
  } = useTronWallet();

  const [balances, setBalances] = useState({
    USDT_BSC: '0',
    USDC_ETH: '0',
    BRTC: '0',
    USDT_TRC20: '0',
  });
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  const fetchTokenBalance = async (tokenConfig) => {
    if (!provider || !address) return '0';

    try {
      if (chainId !== tokenConfig.chainId) return '0';

      const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, provider);
      const balance = await contract.balanceOf(address);
      return formatTokenAmount(balance.toString(), tokenConfig.decimals);
    } catch (error) {
      console.error(`Error fetching ${tokenConfig.symbol} balance:`, error);
      return '0';
    }
  };

  const loadBalances = async () => {
    setLoading(true);
    try {
      let usdtBsc = '0', usdcEth = '0', brtc = '0';
      if (isConnected) {
        usdtBsc = await fetchTokenBalance(TOKENS.USDT_BSC);
        usdcEth = await fetchTokenBalance(TOKENS.USDC_ETH);
        brtc = await fetchTokenBalance(TOKENS.BRTC);
      }

      let usdtTrc20 = '0';
      if (isTronConnected && tronAddress) {
        usdtTrc20 = await getTrc20Balance(tronAddress, TOKENS.USDT_TRC20.address);
      }

      setBalances({
        USDT_BSC: usdtBsc,
        USDC_ETH: usdcEth,
        BRTC: brtc,
        USDT_TRC20: usdtTrc20,
      });
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected || isTronConnected) {
      loadBalances();
    }
  }, [address, chainId, isConnected, tronAddress, isTronConnected]);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = async (addr, type) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(type);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Handle disconnect with confirmation
  const handleDisconnect = (type) => {
    const confirmMsg = type === 'metamask' 
      ? 'Disconnect MetaMask wallet?' 
      : 'Disconnect TronLink wallet?';
    
    if (window.confirm(confirmMsg)) {
      if (type === 'metamask') {
        disconnectWallet();
      } else {
        disconnectTronWallet();
      }
    }
  };

  return (
    <div className="crypto-balances">
      <div className="crypto-header">
        <h3>💎 Crypto Wallets</h3>
        
        <div className="wallet-buttons">
          {/* MetaMask Section */}
          {!isConnected ? (
            <button onClick={connectWallet} className="btn-connect-wallet metamask">
              🦊 Connect MetaMask
            </button>
          ) : (
            <div className="wallet-connected-card">
              <div className="wallet-header">
                <span className="wallet-label">🦊 MetaMask</span>
                <button 
                  onClick={() => handleDisconnect('metamask')} 
                  className="btn-disconnect"
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
              <div className="wallet-actions">
                <span className="wallet-address">{formatAddress(address)}</span>
                <button 
                  onClick={() => copyToClipboard(address, 'metamask')} 
                  className="btn-copy"
                  title="Copy full address"
                >
                  {copiedAddress === 'metamask' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}

          {/* TronLink Section */}
          {!isTronConnected ? (
            <button onClick={connectTronWallet} className="btn-connect-wallet tronlink">
              🔺 Connect TronLink
            </button>
          ) : (
            <div className="wallet-connected-card tron">
              <div className="wallet-header">
                <span className="wallet-label">🔺 TronLink</span>
                <button 
                  onClick={() => handleDisconnect('tronlink')} 
                  className="btn-disconnect"
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
              <div className="wallet-actions">
                <span className="wallet-address tron">{formatAddress(tronAddress)}</span>
                <button 
                  onClick={() => copyToClipboard(tronAddress, 'tronlink')} 
                  className="btn-copy"
                  title="Copy full address"
                >
                  {copiedAddress === 'tronlink' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(isConnected || isTronConnected) && (
        <>
          <div className="crypto-balances-grid">
            <div className="crypto-card">
              <div className="crypto-icon">
                <span className="crypto-symbol">💵</span>
              </div>
              <div className="crypto-info">
                <h4>USDT</h4>
                <p className="crypto-chain">Binance Smart Chain</p>
              </div>
              <div className="crypto-balance">
                {loading ? (
                  <div className="loading-spinner">⏳</div>
                ) : (
                  <>
                    <span className="balance-amount">{balances.USDT_BSC}</span>
                    <span className="balance-symbol">USDT</span>
                  </>
                )}
              </div>
              {isConnected && chainId !== 56 && (
                <p className="network-warning">⚠️ Switch to BSC</p>
              )}
              {!isConnected && <p className="network-warning">🦊 Connect MetaMask</p>}
            </div>

            <div className="crypto-card">
              <div className="crypto-icon">
                <span className="crypto-symbol">💵</span>
              </div>
              <div className="crypto-info">
                <h4>USDC</h4>
                <p className="crypto-chain">Ethereum</p>
              </div>
              <div className="crypto-balance">
                {loading ? (
                  <div className="loading-spinner">⏳</div>
                ) : (
                  <>
                    <span className="balance-amount">{balances.USDC_ETH}</span>
                    <span className="balance-symbol">USDC</span>
                  </>
                )}
              </div>
              {isConnected && chainId !== 1 && (
                <p className="network-warning">⚠️ Switch to Ethereum</p>
              )}
              {!isConnected && <p className="network-warning">🦊 Connect MetaMask</p>}
            </div>

            <div className="crypto-card tron-card">
              <div className="crypto-icon">
                <span className="crypto-symbol">💵</span>
              </div>
              <div className="crypto-info">
                <h4>USDT</h4>
                <p className="crypto-chain">Tron Network</p>
              </div>
              <div className="crypto-balance">
                {loading ? (
                  <div className="loading-spinner">⏳</div>
                ) : (
                  <>
                    <span className="balance-amount">{balances.USDT_TRC20}</span>
                    <span className="balance-symbol">USDT</span>
                  </>
                )}
              </div>
              {!isTronConnected && <p className="network-warning">🔺 Connect TronLink</p>}
            </div>


            <div className="crypto-card brtc-card">
              <div className="crypto-icon">
                <span className="crypto-symbol">🪙</span>
              </div>
              <div className="crypto-info">
                <h4>BRTC</h4>
                <p className="crypto-chain">Binance Smart Chain</p>
              </div>
              <div className="crypto-balance">
                {loading ? (
                  <div className="loading-spinner">⏳</div>
                ) : (
                  <>
                    <span className="balance-amount">{balances.BRTC}</span>
                    <span className="balance-symbol">BRTC</span>
                  </>
                )}
              </div>
              {isConnected && chainId !== 56 && (
                <p className="network-warning">⚠️ Switch to BSC</p>
              )}
            </div>
          </div>

          <button onClick={loadBalances} className="btn-refresh" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh Balances'}
          </button>
        </>
      )}

      <style jsx>{`
        .crypto-balances {
          background: rgba(255, 167, 38, 0.1);
          border: 2px solid #FFA726;
          border-radius: 16px;
          padding: 24px;
          margin: 20px 0;
        }

        .crypto-header {
          margin-bottom: 20px;
        }

        .crypto-header h3 {
          color: #FFA726;
          margin: 0 0 16px 0;
        }

        .wallet-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-connect-wallet {
          background: linear-gradient(135deg, #FFA726, #FFB84D);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-connect-wallet.tronlink {
          background: linear-gradient(135deg, #FF0013, #FF4F5A);
        }

        .btn-connect-wallet:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 167, 38, 0.4);
        }

        .wallet-connected-card {
          background: rgba(255, 167, 38, 0.15);
          border: 1px solid rgba(255, 167, 38, 0.4);
          border-radius: 12px;
          padding: 16px;
        }

        .wallet-connected-card.tron {
          background: rgba(255, 0, 19, 0.15);
          border-color: rgba(255, 0, 19, 0.4);
        }

        .wallet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .wallet-label {
          color: #FFA726;
          font-weight: 600;
          font-size: 14px;
        }

        .wallet-connected-card.tron .wallet-label {
          color: #FF0013;
        }

        .wallet-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
        }

        .wallet-address {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 8px;
          color: #FFA726;
          font-family: monospace;
          font-size: 14px;
          flex: 1;
        }

        .wallet-address.tron {
          color: #FF0013;
        }

        .btn-copy {
          background: linear-gradient(135deg, #4CAF50, #66BB6A);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .btn-copy:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .btn-disconnect {
          background: rgba(255, 0, 0, 0.2);
          color: #ff6b6b;
          border: 1px solid rgba(255, 0, 0, 0.4);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
        }

        .btn-disconnect:hover {
          background: rgba(255, 0, 0, 0.3);
          color: white;
        }

        .crypto-balances-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .crypto-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 167, 38, 0.3);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.3s;
        }

        .crypto-card:hover {
          border-color: #FFA726;
          transform: translateY(-2px);
        }

        .tron-card {
          border-color: rgba(255, 0, 19, 0.3);
        }

        .tron-card:hover {
          border-color: #FF0013;
        }

        .brtc-card {
          border-color: #FFD700;
        }

        .brtc-card:hover {
          border-color: #FFA500;
        }

        .crypto-icon img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }

        .crypto-info h4 {
          color: #FFA726;
          margin: 0;
          font-size: 18px;
        }

        .crypto-chain {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          margin: 4px 0 0 0;
        }

        .crypto-balance {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .balance-amount {
          color: white;
          font-size: 24px;
          font-weight: 700;
        }

        .balance-symbol {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .coming-soon {
          color: #FFD700;
          font-style: italic;
          margin: 0;
        }

        .network-warning {
          color: #ff9800;
          font-size: 12px;
          margin: 8px 0 0 0;
        }

        .loading-spinner {
          font-size: 24px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn-refresh {
          width: 100%;
          background: rgba(255, 167, 38, 0.2);
          border: 1px solid #FFA726;
          color: #FFA726;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-refresh:hover:not(:disabled) {
          background: rgba(255, 167, 38, 0.3);
        }

        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default CryptoBalances;