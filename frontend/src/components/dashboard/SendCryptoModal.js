import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { useTronWallet } from '../../contexts/TronWalletContext';
import { TOKENS, ERC20_ABI } from '../../config/tokens.config';
import './SendCryptoModal.css';

const SendCryptoModal = ({ isOpen, onClose, addNotification }) => {
  const { address, signer, chainId, switchNetwork } = useWallet();
  const { tronAddress, tronWeb } = useTronWallet();

  const [selectedToken, setSelectedToken] = useState('USDT_BSC');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const availableTokens = [
    { key: 'USDT_BSC', label: 'USDT (BEP-20)', chain: 'BSC' },
    { key: 'USDC_ETH', label: 'USDC (ERC-20)', chain: 'ETHEREUM' },
    { key: 'USDT_TRC20', label: 'USDT (TRC-20)', chain: 'TRON' },
    { key: 'BRTC', label: 'BRTC (BEP-20)', chain: 'BSC' },
  ];

  const tokenConfig = TOKENS[selectedToken];
  const isTronToken = tokenConfig.chain === 'TRON';
  const connectedWallet = isTronToken ? tronAddress : address;

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && connectedWallet) {
      loadBalance();
    }
  }, [selectedToken, connectedWallet, isOpen]);

  useEffect(() => {
    if (recipientAddress && amount && parseFloat(amount) > 0 && !isTronToken) {
      estimateGas();
    }
  }, [recipientAddress, amount, selectedToken]);

  const resetForm = () => {
    setRecipientAddress('');
    setAmount('');
    setBalance('0');
    setGasEstimate(null);
    setSuccess(false);
    setTxHash(null);
  };

  const loadBalance = async () => {
    try {
      if (isTronToken) {
        await loadTronBalance();
      } else {
        await loadEvmBalance();
      }
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  };

  const loadEvmBalance = async () => {
    if (!address || !signer) return;
    try {
      if (tokenConfig.type === 'NATIVE') {
        const balance = await signer.provider.getBalance(address);
        setBalance(ethers.formatEther(balance));
      } else {
        const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);
        const balance = await contract.balanceOf(address);
        const formatted = ethers.formatUnits(balance, tokenConfig.decimals);
        setBalance(formatted);
      }
    } catch (err) {
      console.error('Error loading EVM balance:', err);
      setBalance('0');
    }
  };

  const loadTronBalance = async () => {
    if (!tronAddress || !tronWeb) return;
    try {
      if (tokenConfig.symbol === 'USDT') {
        const contract = await tronWeb.contract().at(tokenConfig.address);
        const balance = await contract.balanceOf(tronAddress).call();
        const decimals = await contract.decimals().call();
        const formatted = (balance.toString() / Math.pow(10, decimals)).toFixed(4);
        setBalance(formatted);
      }
    } catch (err) {
      console.error('Error loading Tron balance:', err);
      setBalance('0');
    }
  };

  const estimateGas = async () => {
    if (!address || !signer || isTronToken) return;
    try {
      if (chainId !== tokenConfig.chainId) {
        setGasEstimate(null);
        return;
      }
      const amountWei = ethers.parseUnits(amount, tokenConfig.decimals);
      let gasLimit;
      if (tokenConfig.type === 'NATIVE') {
        gasLimit = await signer.estimateGas({
          to: recipientAddress,
          value: amountWei,
        });
      } else {
        const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);
        gasLimit = await contract.transfer.estimateGas(recipientAddress, amountWei);
      }
      const feeData = await signer.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const gasCost = gasLimit * gasPrice;
      const gasCostEth = ethers.formatEther(gasCost);
      setGasEstimate({
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        gasCost: gasCostEth,
      });
    } catch (err) {
      console.error('Error estimating gas:', err);
      setGasEstimate(null);
    }
  };

  const validateInputs = () => {
    if (!recipientAddress) {
      addNotification('error', 'Please enter recipient address');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      addNotification('error', 'Please enter a valid amount');
      return false;
    }
    if (parseFloat(amount) > parseFloat(balance)) {
      addNotification('error', 'Insufficient balance');
      return false;
    }
    if (isTronToken) {
      if (!recipientAddress.match(/^T[a-zA-Z0-9]{33}$/)) {
        addNotification('error', 'Invalid Tron address format');
        return false;
      }
    } else {
      if (!ethers.isAddress(recipientAddress)) {
        addNotification('error', 'Invalid Ethereum address format');
        return false;
      }
    }
    return true;
  };

  const handleSend = async () => {
    setSuccess(false);
    if (!validateInputs()) return;
    if (isTronToken && !tronAddress) {
      addNotification('error', 'Please connect TronLink wallet first');
      return;
    }
    if (!isTronToken && !address) {
      addNotification('error', 'Please connect MetaMask wallet first');
      return;
    }
    if (!isTronToken && chainId !== tokenConfig.chainId) {
      addNotification('error', `Please switch to ${tokenConfig.chain} network`);
      return;
    }
    setIsLoading(true);
    try {
      let hash;
      if (isTronToken) {
        hash = await sendTronTransaction();
      } else {
        hash = await sendEvmTransaction();
      }
      setTxHash(hash);
      setSuccess(true);
      addNotification('success', 'Transaction sent successfully!');
      await saveTransactionToBackend(hash);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Transaction error:', err);
      addNotification('error', err.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const sendEvmTransaction = async () => {
    const amountWei = ethers.parseUnits(amount, tokenConfig.decimals);
    if (tokenConfig.type === 'NATIVE') {
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei,
      });
      await tx.wait();
      return tx.hash;
    } else {
      const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, signer);
      const tx = await contract.transfer(recipientAddress, amountWei);
      await tx.wait();
      return tx.hash;
    }
  };

  const sendTronTransaction = async () => {
    if (tokenConfig.symbol === 'USDT') {
      const contract = await tronWeb.contract().at(tokenConfig.address);
      const decimals = await contract.decimals().call();
      const amountWithDecimals = parseFloat(amount) * Math.pow(10, decimals);
      const tx = await contract.transfer(recipientAddress, amountWithDecimals).send({
        feeLimit: 100_000_000,
      });
      return tx;
    }
  };

  const saveTransactionToBackend = async (txHash) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${process.env.REACT_APP_API_URL}/transactions/crypto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'send',
          token: tokenConfig.symbol,
          amount: parseFloat(amount),
          recipientAddress,
          txHash,
          chain: tokenConfig.chain,
          status: 'completed',
        }),
      });
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  const handleMaxAmount = () => {
    if (isTronToken) {
      setAmount(balance);
    } else {
      if (tokenConfig.type === 'NATIVE' && gasEstimate) {
        const maxAmount = parseFloat(balance) - parseFloat(gasEstimate.gasCost);
        setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0');
      } else {
        setAmount(balance);
      }
    }
  };

  const getBlockExplorerUrl = () => {
    if (!txHash) return '#';
    if (isTronToken) {
      return `https://tronscan.org/#/transaction/${txHash}`;
    } else if (tokenConfig.chain === 'BSC') {
      return `https://bscscan.com/tx/${txHash}`;
    } else {
      return `https://etherscan.io/tx/${txHash}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content send-crypto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💸 Send Crypto</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {success ? (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Transaction Successful!</h3>
              <p>Your crypto has been sent successfully.</p>
              {txHash && (
                <a href={getBlockExplorerUrl()} target="_blank" rel="noopener noreferrer" className="tx-link">
                  View on Explorer →
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Select Token</label>
                <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)} className="form-control" disabled={isLoading}>
                  {availableTokens.map((token) => (
                    <option key={token.key} value={token.key}>{token.label}</option>
                  ))}
                </select>
                <div className="balance-info">Balance: {parseFloat(balance).toFixed(4)} {tokenConfig.symbol}</div>
              </div>
              {!connectedWallet && (
                <div className="warning-message">⚠️ Please connect your {isTronToken ? 'TronLink' : 'MetaMask'} wallet first</div>
              )}
              {!isTronToken && connectedWallet && chainId !== tokenConfig.chainId && (
                <div className="warning-message">
                  ⚠️ Please switch to {tokenConfig.chain} network
                  <button onClick={() => switchNetwork(tokenConfig.chainId)} className="btn-switch-network">Switch Network</button>
                </div>
              )}
              <div className="form-group">
                <label>Recipient Address</label>
                <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder={isTronToken ? 'T...' : '0x...'} className="form-control" disabled={isLoading || !connectedWallet} />
              </div>
              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input-wrapper">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="form-control" disabled={isLoading || !connectedWallet} step="any" min="0" />
                  <button type="button" onClick={handleMaxAmount} className="btn-max" disabled={isLoading || !connectedWallet}>MAX</button>
                </div>
              </div>
              {!isTronToken && gasEstimate && (
                <div className="gas-estimate">
                  <div className="gas-row">
                    <span>Estimated Gas:</span>
                    <span>{parseFloat(gasEstimate.gasCost).toFixed(6)} {tokenConfig.chain === 'BSC' ? 'BNB' : 'ETH'}</span>
                  </div>
                  <div className="gas-row small">
                    <span>Gas Price:</span>
                    <span>{parseFloat(gasEstimate.gasPrice).toFixed(2)} Gwei</span>
                  </div>
                </div>
              )}
              {isTronToken && amount && (
                <div className="gas-estimate">
                  <div className="gas-row">
                    <span>Network Fee:</span>
                    <span>~1-10 TRX</span>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
                <button onClick={handleSend} className="btn-primary" disabled={isLoading || !connectedWallet || (!isTronToken && chainId !== tokenConfig.chainId)}>
                  {isLoading ? 'Sending...' : `Send ${tokenConfig.symbol}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendCryptoModal;