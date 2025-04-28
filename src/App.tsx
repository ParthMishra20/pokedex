import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useWallet } from './contexts/WalletContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Marketplace from './pages/Marketplace';
import MyCollection from './pages/MyCollection';
import PokemonDetail from './pages/PokemonDetail';
import { PokemonNFT } from './types';

function App() {
  const { wallet } = useWallet();

  // Initialize localStorage with some sample data for demo purposes
  useEffect(() => {
    const initLocalStorage = async () => {
      // Skip if data already exists
      if (localStorage.getItem('pokemonNFTs')) return;
      
      try {
        // Here you'd normally make API calls to blockchain or backend
        // For demo, we'll store NFT state in localStorage
        const sampleData: PokemonNFT[] = [];
        localStorage.setItem('pokemonNFTs', JSON.stringify(sampleData));
      } catch (err) {
        console.error('Error initializing local storage:', err);
      }
    };

    initLocalStorage();
  }, []);

  // Update NFT ownership when wallet changes
  useEffect(() => {
    if (wallet.address) {
      // This is where you'd sync with blockchain state
      console.log('Wallet connected:', wallet.address);
    }
  }, [wallet.address]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/my-collection" element={<MyCollection />} />
          <Route path="/pokemon/:id" element={<PokemonDetail />} />
        </Routes>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:order-2 space-x-6">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                Discord
              </a>
            </div>
            <div className="mt-8 md:mt-0 md:order-1">
              <p className="text-center text-base text-gray-400">
                &copy; 2025 Pokedex NFT Marketplace. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;