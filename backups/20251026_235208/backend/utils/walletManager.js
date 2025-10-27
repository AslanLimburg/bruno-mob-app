const { ethers } = require('ethers');
const TronWebLib = require('tronweb');
const TronWeb = TronWebLib.TronWeb || TronWebLib;
const { decryptPrivateKey } = require('./encryption');
const { ERC20_ABI } = require('../config/tokenConfig');


class WalletManager {
  constructor() {
    this.providers = {
      BSC: new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/'),
      ETHEREUM: new ethers.JsonRpcProvider('https://eth.llamarpc.com'),
    };

    this.tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });
  }

  /**
   * Получить кошелёк для EVM сетей (BSC, Ethereum)
   */
  getEVMWallet(chain = 'BSC') {
    try {
      const encryptedKey = process.env.TREASURY_METAMASK_PRIVATE_KEY_ENCRYPTED;
      if (!encryptedKey) {
        throw new Error('Treasury MetaMask key not configured');
      }

      const privateKey = decryptPrivateKey(encryptedKey);
      const provider = this.providers[chain];
      const wallet = new ethers.Wallet(privateKey, provider);

      return wallet;
    } catch (error) {
      console.error('Error getting EVM wallet:', error);
      throw error;
    }
  }

  /**
   * Получить кошелёк для Tron сети
   */
  getTronWallet() {
    try {
      const encryptedKey = process.env.TREASURY_TRONLINK_PRIVATE_KEY_ENCRYPTED;
      if (!encryptedKey) {
        throw new Error('Treasury TronLink key not configured');
      }

      const privateKey = decryptPrivateKey(encryptedKey);
      this.tronWeb.setPrivateKey(privateKey);

      return this.tronWeb;
    } catch (error) {
      console.error('Error getting Tron wallet:', error);
      throw error;
    }
  }

  /**
   * Отправить ERC20/BEP20 токены
   */
  async sendERC20(tokenAddress, recipientAddress, amount, chain = 'BSC') {
    try {
      const wallet = this.getEVMWallet(chain);
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

      // Получаем decimals токена
      const decimals = await contract.decimals();
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);

      // Отправляем транзакцию
      const tx = await contract.transfer(recipientAddress, amountInWei);
      console.log(`Transaction sent: ${tx.hash}`);

      // Ждём подтверждения
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${receipt.hash}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      console.error('Error sending ERC20:', error);
      throw error;
    }
  }

  /**
   * Отправить TRC20 токены
   */
  async sendTRC20(tokenAddress, recipientAddress, amount) {
    try {
      const tronWeb = this.getTronWallet();

      // Получаем контракт
      const contract = await tronWeb.contract().at(tokenAddress);

      // Получаем decimals
      const decimals = await contract.decimals().call();
      const amountInSun = amount * Math.pow(10, decimals);

      // Отправляем
      const tx = await contract.transfer(recipientAddress, amountInSun).send();

      console.log(`Tron transaction sent: ${tx}`);

      return {
        success: true,
        txHash: tx,
      };
    } catch (error) {
      console.error('Error sending TRC20:', error);
      throw error;
    }
  }

  /**
   * Отправить нативные TRX
   */
  async sendTRX(recipientAddress, amount) {
    try {
      const tronWeb = this.getTronWallet();

      // Конвертируем в SUN (1 TRX = 1,000,000 SUN)
      const amountInSun = tronWeb.toSun(amount);

      // Отправляем
      const tx = await tronWeb.trx.sendTransaction(recipientAddress, amountInSun);

      console.log(`TRX sent: ${tx.txid}`);

      return {
        success: true,
        txHash: tx.txid,
      };
    } catch (error) {
      console.error('Error sending TRX:', error);
      throw error;
    }
  }

  /**
   * Получить баланс токена
   */
  async getTokenBalance(tokenAddress, walletAddress, chain = 'BSC') {
    try {
      if (chain === 'TRON') {
        const tronWeb = this.getTronWallet();
        const contract = await tronWeb.contract().at(tokenAddress);
        const balance = await contract.balanceOf(walletAddress).call();
        const decimals = await contract.decimals().call();
        return balance / Math.pow(10, decimals);
      } else {
        const provider = this.providers[chain];
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        const decimals = await contract.decimals();
        return parseFloat(ethers.formatUnits(balance, decimals));
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  /**
   * Получить адрес treasury кошелька
   */
  getTreasuryAddress(type = 'METAMASK') {
    try {
      if (type === 'METAMASK') {
        const wallet = this.getEVMWallet('BSC');
        return wallet.address;
      } else if (type === 'TRONLINK') {
        const tronWeb = this.getTronWallet();
        return tronWeb.defaultAddress.base58;
      }
    } catch (error) {
      console.error('Error getting treasury address:', error);
      return null;
    }
  }
}

// Экспорт singleton instance
module.exports = new WalletManager();
