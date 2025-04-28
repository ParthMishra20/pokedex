import React, { useState } from 'react';
import { ChevronDown, Check, AlertTriangle, Layers } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

interface NetworkOption {
  id: number;
  name: string;
  icon: string | React.ReactNode;
  testnet: boolean;
}

const NETWORKS: NetworkOption[] = [
  {
    id: 1,
    name: 'Ethereum',
    icon: '🔷',
    testnet: false
  },
  {
    id: 5,
    name: 'Goerli',
    icon: '🔵',
    testnet: true
  },
  {
    id: 137,
    name: 'Polygon',
    icon: '🟣',
    testnet: false
  },
  {
    id: 80001,
    name: 'Mumbai',
    icon: '🟪',
    testnet: true
  },
  {
    id: 31337,
    name: 'Hardhat',
    icon: '🛠️',
    testnet: true
  },
  {
    id: 1337,
    name: 'Localhost',
    icon: '💻',
    testnet: true
  }
];

interface NetworkSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact' | 'dropdown';
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ 
  className = '', 
  variant = 'default' 
}) => {
  const { wallet, switchNetwork, isNetworkSupported } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  
  // Find current network info
  const currentNetwork = NETWORKS.find(n => n.id === wallet.chainId) || {
    id: wallet.chainId || 0,
    name: wallet.networkName || 'Unknown Network',
    icon: '❓',
    testnet: false
  };
  
  // Handle network switch
  const handleSwitchNetwork = async (networkId: number) => {
    if (switching !== null) return;
    
    try {
      setSwitching(networkId);
      const success = await switchNetwork(networkId);
      if (!success) {
        console.error(`Failed to switch to network ID: ${networkId}`);
      }
    } catch (error) {
      console.error('Error switching network:', error);
    } finally {
      setSwitching(null);
      setIsOpen(false);
    }
  };
  
  // Render dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            ${isNetworkSupported ? 'bg-white border border-gray-200' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}
        >
          <span className="text-base">{currentNetwork.icon}</span>
          <span>{currentNetwork.name}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg py-2 w-56 border border-gray-100 z-10">
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              Select Network
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleSwitchNetwork(network.id)}
                  disabled={switching !== null}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between
                    hover:bg-gray-50 ${wallet.chainId === network.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{network.icon}</span>
                    <span className="text-sm font-medium">{network.name}</span>
                    {network.testnet && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        Testnet
                      </span>
                    )}
                  </div>
                  
                  {(wallet.chainId === network.id) && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                  
                  {(switching === network.id) && (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Render compact variant (just an icon button with dropdown)
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-full
            ${isNetworkSupported ? 'text-gray-600 hover:bg-gray-100' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
          title={`Network: ${currentNetwork.name}`}
        >
          <Layers className="h-5 w-5" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg py-2 w-56 border border-gray-100 z-10">
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              Select Network
            </div>
            
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                onClick={() => handleSwitchNetwork(network.id)}
                disabled={switching !== null}
                className={`w-full text-left px-3 py-2 flex items-center justify-between
                  hover:bg-gray-50 ${wallet.chainId === network.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{network.icon}</span>
                  <span className="text-sm font-medium">{network.name}</span>
                  {network.testnet && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      Testnet
                    </span>
                  )}
                </div>
                
                {wallet.chainId === network.id && (
                  <Check className="h-4 w-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Default variant (full width)
  return (
    <div className={`bg-white rounded-lg border ${!isNetworkSupported ? 'border-amber-200' : 'border-gray-200'} p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium">Network</h3>
        </div>
        
        {!isNetworkSupported && (
          <div className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Unsupported Network
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2 border border-gray-200 bg-gray-50 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentNetwork.icon}</span>
            <div>
              <p className="font-medium">{currentNetwork.name}</p>
              <p className="text-xs text-gray-500">{wallet.chainId ? `Chain ID: ${wallet.chainId}` : 'Not connected'}</p>
            </div>
          </div>
          
          {currentNetwork.testnet && (
            <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
              Testnet
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {NETWORKS.map((network) => (
            <button
              key={network.id}
              onClick={() => handleSwitchNetwork(network.id)}
              disabled={switching !== null || wallet.chainId === network.id}
              className={`flex items-center justify-between px-3 py-2 rounded-md border 
                ${wallet.chainId === network.id 
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'} 
                ${switching === network.id ? 'opacity-50' : ''}
                ${switching !== null && switching !== network.id ? 'opacity-30' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{network.icon}</span>
                <span>{network.name}</span>
              </div>
              
              {wallet.chainId === network.id && (
                <Check className="h-4 w-4 text-blue-500" />
              )}
              
              {switching === network.id && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkSwitcher;