import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet2, User, ChevronDown, Coins, X, Menu, AlertTriangle, Layers, Check } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

const Navbar: React.FC = () => {
  const { connect, disconnect, switchNetwork, wallet, isNetworkSupported } = useWallet();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  
  const toggleProfileMenu = () => {
    setShowProfileMenu(prev => !prev);
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };
  
  const toggleNetworkDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent profile menu from closing
    setShowNetworkDropdown(prev => !prev);
  };
  
  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Handle network switching to a specific network
  const handleSwitchNetwork = async (chainId: number, networkName: string) => {
    if (switchingNetwork) return;
    
    try {
      setSwitchingNetwork(true);
      console.log(`Switching to ${networkName} (Chain ID: ${chainId})`);
      await switchNetwork(chainId);
      setShowNetworkDropdown(false);
    } catch (error) {
      console.error(`Failed to switch to ${networkName}:`, error);
    } finally {
      setSwitchingNetwork(false);
    }
  };
  
  // Network options for the dropdown
  const networkOptions = [
    { id: 1, name: 'Ethereum Mainnet' },
    { id: 11155111, name: 'Sepolia Testnet' }
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.jpg" alt="Pokedex Logo" className="h-10 w-auto rounded-md mr-2" />
              <span className="text-xl font-bold text-gray-800">Pokedex</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
              Home
            </Link>
            <Link to="/marketplace" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
              Marketplace
            </Link>
            <Link to="/my-collection" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
              My Collection
            </Link>
            
            {/* Network Warning Banner */}
            {wallet.isConnected && !isNetworkSupported && (
              <div className="flex items-center px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-md">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-xs mr-2">Unsupported Network</span>
                <button 
                  onClick={() => handleSwitchNetwork(1, 'Ethereum Mainnet')}
                  disabled={switchingNetwork}
                  className="text-xs bg-amber-200 px-2 py-0.5 rounded hover:bg-amber-300"
                >
                  {switchingNetwork ? 'Switching...' : 'Switch'}
                </button>
              </div>
            )}
            
            {wallet.isConnected ? (
              <div className="relative">
                <button
                  onClick={toggleProfileMenu}
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <User className="h-5 w-5 mr-2" />
                  <span className="mr-2 hidden lg:inline">Profile</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl py-2 z-10">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm text-gray-600">Connected Wallet</p>
                      <p className="text-sm font-mono break-all">{wallet.address}</p>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Layers className="h-4 w-4 text-blue-500 mr-2" />
                          <p className="text-sm text-gray-600">Network</p>
                        </div>
                        
                        {/* Network selector dropdown */}
                        <div className="relative">
                          <button
                            onClick={toggleNetworkDropdown}
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 rounded-md px-2 py-1 hover:bg-gray-100"
                          >
                            Switch <ChevronDown className="ml-1 h-4 w-4" />
                          </button>
                          
                          {showNetworkDropdown && (
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                {networkOptions.map(network => (
                                  <button
                                    key={network.id}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                    onClick={() => handleSwitchNetwork(network.id, network.name)}
                                    disabled={switchingNetwork}
                                  >
                                    {network.name}
                                    {wallet.chainId === network.id && (
                                      <Check className="h-4 w-4 text-green-500" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-1">
                        <p className="text-sm font-semibold">
                          {wallet.networkName || 'Unknown Network'}
                        </p>
                        
                        {/* Network status indicator */}
                        <span className={`ml-2 inline-block w-2 h-2 rounded-full ${isNetworkSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <Coins className="h-4 w-4 text-blue-500 mr-2" />
                        <p className="text-sm text-gray-600">Balance</p>
                      </div>
                      <p className="text-sm font-semibold">{wallet.balance} {wallet.chainId === 137 || wallet.chainId === 80001 ? 'MATIC' : 'ETH'}</p>
                    </div>
                    <div className="px-4 py-2">
                      <button 
                        onClick={disconnect}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={wallet.isConnecting}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
              >
                <Wallet2 className="h-5 w-5 mr-2" />
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            {wallet.isConnected && (
              <button
                onClick={toggleProfileMenu}
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 mr-2"
              >
                <User className="h-6 w-6" />
              </button>
            )}
            
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Network Warning Banner for mobile */}
      {wallet.isConnected && !isNetworkSupported && mobileMenuOpen && (
        <div className="md:hidden px-4 py-2 bg-amber-100 border-y border-amber-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-amber-800" />
              <span className="text-sm text-amber-800">Unsupported Network: {wallet.networkName}</span>
            </div>
            <button 
              onClick={() => handleSwitchNetwork(1, 'Ethereum Mainnet')}
              disabled={switchingNetwork}
              className="text-xs bg-amber-200 px-3 py-1 rounded hover:bg-amber-300 text-amber-800"
            >
              {switchingNetwork ? 'Switching...' : 'Switch Network'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/marketplace"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link 
              to="/my-collection"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Collection
            </Link>
            
            {!wallet.isConnected && (
              <button
                onClick={handleConnectWallet}
                disabled={wallet.isConnecting}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 mt-3"
              >
                <Wallet2 className="h-5 w-5 mr-2" />
                {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile profile menu */}
      {showProfileMenu && wallet.isConnected && (
        <div className="md:hidden px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="mb-3">
            <p className="text-xs text-gray-500">Connected Wallet</p>
            <p className="text-sm font-mono break-all">{wallet.address}</p>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Layers className="h-4 w-4 text-blue-500 mr-2" />
                <p className="text-xs text-gray-500">Network</p>
              </div>
              
              {/* Mobile network selector */}
              <div className="relative">
                <button
                  onClick={toggleNetworkDropdown}
                  className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center"
                >
                  Switch Network <ChevronDown className="ml-1 h-3 w-3" />
                </button>
                
                {showNetworkDropdown && (
                  <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      {networkOptions.map(network => (
                        <button
                          key={network.id}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => handleSwitchNetwork(network.id, network.name)}
                          disabled={switchingNetwork}
                        >
                          {network.name}
                          {wallet.chainId === network.id && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center mt-1">
              <p className="text-sm font-semibold">{wallet.networkName || 'Unknown'}</p>
              <span className={`ml-2 inline-block w-2 h-2 rounded-full ${isNetworkSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center">
              <Coins className="h-4 w-4 text-blue-500 mr-2" />
              <p className="text-xs text-gray-500">Balance</p>
            </div>
            <p className="text-sm font-semibold">
              {wallet.balance} {wallet.chainId === 137 || wallet.chainId === 80001 ? 'MATIC' : 'ETH'}
            </p>
          </div>
          <button 
            onClick={disconnect}
            className="w-full text-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;