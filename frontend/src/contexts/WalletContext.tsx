import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BrowserProvider, Eip1193Provider } from 'ethers'

interface WalletContextType {
  address: string | null
  isConnected: boolean
  provider: BrowserProvider | null
  connect: () => Promise<void>
  disconnect: () => void
  chainId: number | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)

  const isConnected = !!address

  // Проверка при загрузке - есть ли уже подключенный кошелёк
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const browserProvider = new BrowserProvider(window.ethereum as Eip1193Provider)
          const accounts = await browserProvider.listAccounts()
          
          if (accounts.length > 0) {
            const signer = await browserProvider.getSigner()
            const userAddress = await signer.getAddress()
            const network = await browserProvider.getNetwork()
            
            setProvider(browserProvider)
            setAddress(userAddress)
            setChainId(Number(network.chainId))
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error)
        }
      }
    }

    checkConnection()
  }, [])

  // Слушаем изменения аккаунта
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          setAddress(accounts[0])
        }
      }

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16))
        window.location.reload() // Рекомендуется MetaMask
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask не установлен! Пожалуйста, установите MetaMask.')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum as Eip1193Provider)
      const accounts = await browserProvider.send('eth_requestAccounts', [])
      
      const signer = await browserProvider.getSigner()
      const userAddress = await signer.getAddress()
      const network = await browserProvider.getNetwork()

      setProvider(browserProvider)
      setAddress(userAddress)
      setChainId(Number(network.chainId))
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    }
  }

  const disconnect = () => {
    setAddress(null)
    setProvider(null)
    setChainId(null)
  }

  const value: WalletContextType = {
    address,
    isConnected,
    provider,
    connect,
    disconnect,
    chainId,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

// Добавляем типы для window.ethereum
declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}