import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import { WalletState } from '../types';

// Supported chain IDs for the app
const SUPPORTED_CHAIN_IDS = [1, 5, 137, 80001, 31337, 1337, 11155111]; // Mainnet, Goerli, Polygon, Mumbai, Hardhat, Localhost, Sepolia

interface WalletContextType {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<boolean>;
  wallet: WalletState;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  isNetworkSupported: boolean;
}

const initialWalletState: WalletState = {
  address: null,
  chainId: null,
  balance: '0',
  isConnected: false,
  isConnecting: false,
  error: null,
  networkName: null
};

const WalletContext = createContext<WalletContextType>({
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => false,
  wallet: initialWalletState,
  provider: null,
  signer: null,
  isNetworkSupported: false
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(initialWalletState);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null);
  const [isNetworkSupported, setIsNetworkSupported] = useState<boolean>(false);

  // Get network name based on chain ID
  const getNetworkName = (chainId: number): string => {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      137: 'Polygon Mainnet',
      80001: 'Mumbai Testnet',
      31337: 'Hardhat',
      1337: 'Localhost',
      11155111: 'Sepolia Testnet'
    };
    return networks[chainId] || 'Unknown Network';
  };

  // Check if the current network is supported
  const checkNetworkSupport = (chainId: number | null): boolean => {
    if (!chainId) return false;
    return SUPPORTED_CHAIN_IDS.includes(chainId);
  };

  // Initialize Web3Modal with more provider options
  useEffect(() => {
    const providerOptions = {
      // Add more wallet providers as needed
      // For example, WalletConnect:
      // walletconnect: {
      //   package: WalletConnectProvider,
      //   options: {
      //     infuraId: "YOUR_INFURA_ID",
      //   }
      // },
    };

    const web3ModalInstance = new Web3Modal({
      cacheProvider: true,
      providerOptions,
      theme: {
        background: "rgb(249, 249, 249)",
        main: "rgb(59, 130, 246)",
        secondary: "rgb(107, 114, 128)",
        border: "rgba(219, 219, 219, 0.3)",
        hover: "rgb(243, 244, 246)"
      }
    });
    
    setWeb3Modal(web3ModalInstance);
    
    // Auto connect if cached provider exists
    if (web3ModalInstance.cachedProvider) {
      connect();
    }
  }, []);

  // Handle chain change
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        const isSupported = checkNetworkSupport(numericChainId);
        setIsNetworkSupported(isSupported);
        
        // Update the wallet state with new chain ID
        setWallet(prev => ({
          ...prev,
          chainId: numericChainId,
          networkName: getNetworkName(numericChainId)
        }));
        
        // Only reload if the chain is supported
        if (isSupported && wallet.isConnected) {
          window.location.reload();
        }
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [wallet.isConnected]);

  // Handle account change
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          updateWalletState(accounts[0]);
        } else {
          await disconnect();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const updateWalletState = async (address: string) => {
    if (!provider) return;

    try {
      const networkInfo = await provider.getNetwork();
      const chainId = networkInfo.chainId;
      const balance = ethers.utils.formatEther(await provider.getBalance(address));
      const networkName = getNetworkName(chainId);
      const isSupported = checkNetworkSupport(chainId);
      
      setIsNetworkSupported(isSupported);
      
      setWallet({
        address,
        chainId,
        balance,
        isConnected: true,
        isConnecting: false,
        error: !isSupported ? `Network not supported: ${networkName}` : null,
        networkName
      });
      
      // Log the updated state for debugging
      console.log("Wallet state updated:", {
        address,
        chainId,
        balance,
        isConnected: true,
        networkName
      });
    } catch (error) {
      console.error("Error updating wallet state:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update wallet state";
      setWallet({
        ...initialWalletState,
        isConnecting: false,
        error: errorMessage
      });
    }
  };

  const connect = async () => {
    if (!web3Modal) return;

    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Connect to provider (triggers MetaMask popup)
      const instance = await web3Modal.connect();
      console.log("Web3Modal connected successfully");
      
      // Setup provider
      const web3Provider = new ethers.providers.Web3Provider(instance);
      const web3Signer = web3Provider.getSigner();
      
      // Set provider and signer
      setProvider(web3Provider);
      setSigner(web3Signer);
      
      // Get connected accounts
      const accounts = await web3Provider.listAccounts();
      console.log("Connected accounts:", accounts);
      
      if (accounts.length > 0) {
        // Get necessary account information
        const address = accounts[0];
        const networkInfo = await web3Provider.getNetwork();
        const chainId = networkInfo.chainId;
        const balance = ethers.utils.formatEther(await web3Provider.getBalance(address));
        const networkName = getNetworkName(chainId);
        const isSupported = checkNetworkSupport(chainId);
        
        setIsNetworkSupported(isSupported);
        
        // Directly update the wallet state instead of using updateWalletState
        setWallet({
          address,
          chainId,
          balance,
          isConnected: true,
          isConnecting: false,
          error: !isSupported ? `Network not supported: ${networkName}` : null,
          networkName
        });
        
        console.log("Wallet connected:", {
          address,
          chainId,
          isConnected: true,
          networkName
        });
      } else {
        throw new Error("No accounts found. Please check your wallet.");
      }
      
      // Set up event listeners for the provider instance
      instance.on("accountsChanged", (accounts: string[]) => {
        console.log("Account changed:", accounts);
        if (accounts.length > 0) {
          updateWalletState(accounts[0]);
        } else {
          disconnect();
        }
      });
      
      instance.on("chainChanged", (chainId: string) => {
        console.log("Chain changed:", chainId);
        window.location.reload();
      });
      
      instance.on("disconnect", (error: { code: number; message: string }) => {
        console.log("Wallet disconnected:", error);
        disconnect();
      });
      
    } catch (error) {
      console.error("Connection error:", error);
      let errorMessage = "Failed to connect wallet";
      
      if (error instanceof Error) {
        // User rejected request
        if (error.message.includes("User rejected")) {
          errorMessage = "Connection rejected by user";
        } else if (error.message.includes("Already processing")) {
          errorMessage = "Wallet connection already in progress";
        } else {
          errorMessage = error.message;
        }
      }
      
      setWallet({
        ...initialWalletState,
        isConnecting: false,
        error: errorMessage
      });
    }
  };

  const disconnect = async () => {
    if (web3Modal) {
      web3Modal.clearCachedProvider();
    }
    
    setWallet(initialWalletState);
    setProvider(null);
    setSigner(null);
    setIsNetworkSupported(false);
    
    // Handle specific wallet providers if needed
    if (window.ethereum && window.ethereum._handleDisconnect) {
      window.ethereum._handleDisconnect();
    }
  };

  // Function to switch networks
  const switchNetwork = async (chainId: number): Promise<boolean> => {
    if (!window.ethereum) {
      setWallet(prev => ({
        ...prev,
        error: "No Ethereum wallet found"
      }));
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      // This error code means the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        // Here you could implement code to add the chain to the wallet
        // e.g., for Mumbai testnet:
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: getNetworkName(chainId),
                nativeCurrency: {
                  name: chainId === 137 || chainId === 80001 ? "MATIC" : "ETH",
                  symbol: chainId === 137 || chainId === 80001 ? "MATIC" : "ETH",
                  decimals: 18
                },
                rpcUrls: [getDefaultRpcUrl(chainId)],
                blockExplorerUrls: [getBlockExplorerUrl(chainId)],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          setWallet(prev => ({
            ...prev,
            error: "Failed to add network to wallet"
          }));
          return false;
        }
      }
      console.error("Error switching network:", switchError);
      setWallet(prev => ({
        ...prev,
        error: "Failed to switch network"
      }));
      return false;
    }
  };

  // Helper functions for network switching
  const getDefaultRpcUrl = (chainId: number): string => {
    const rpcUrls: Record<number, string> = {
      1: "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
      5: "https://eth-goerli.g.alchemy.com/v2/your-api-key",
      137: "https://polygon-rpc.com",
      80001: "https://rpc-mumbai.maticvigil.com",
      31337: "http://127.0.0.1:8545",
      1337: "http://127.0.0.1:8545",
      11155111: "https://sepolia.infura.io/v3/your-api-key"
    };
    return rpcUrls[chainId] || "";
  };

  const getBlockExplorerUrl = (chainId: number): string => {
    const explorers: Record<number, string> = {
      1: "https://etherscan.io",
      5: "https://goerli.etherscan.io",
      137: "https://polygonscan.com",
      80001: "https://mumbai.polygonscan.com",
      31337: "",
      1337: "",
      11155111: "https://sepolia.etherscan.io"
    };
    return explorers[chainId] || "";
  };

  return (
    <WalletContext.Provider value={{ 
      connect, 
      disconnect, 
      switchNetwork,
      wallet, 
      provider, 
      signer,
      isNetworkSupported
    }}>
      {children}
    </WalletContext.Provider>
  );
};