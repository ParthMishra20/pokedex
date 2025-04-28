import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { PokemonNFT, TransactionStatus } from '../types';
import { useWallet } from '../contexts/WalletContext';
import PokemonCard from '../components/PokemonCard';
import { simulateBlockchainTransaction } from '../services/blockchainService';
import { Link } from 'react-router-dom';

const MyCollection: React.FC = () => {
  const { wallet } = useWallet();
  const [myNFTs, setMyNFTs] = useState<PokemonNFT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionStatus>({
    pokemonId: null,
    status: null
  });

  // Fetch owned Pokemon NFTs
  useEffect(() => {
    const fetchMyPokemon = async () => {
      if (!wallet.address) {
        setMyNFTs([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Get all NFTs from localStorage
        const allNFTs = JSON.parse(localStorage.getItem('pokemonNFTs') || '[]');
        
        // Find NFTs with owner matching wallet address
        const ownedNFTs = allNFTs.filter((nft: PokemonNFT) => nft.owner === wallet.address);
        
        console.log(`Found ${ownedNFTs.length} NFTs owned by ${wallet.address}`);
        console.log('Owned NFTs:', ownedNFTs);
        
        setMyNFTs(ownedNFTs);
        setError(null);
      } catch (err) {
        console.error("Error fetching owned NFTs:", err);
        setError('Failed to load your NFT collection. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyPokemon();
    
    // Set up an interval to check for new NFTs periodically
    const interval = setInterval(fetchMyPokemon, 5000);
    
    return () => clearInterval(interval);
  }, [wallet.address]);

  // Handle listing an NFT for sale
  const handleListForSale = async (pokemon: PokemonNFT, price: string) => {
    if (!wallet.address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      // Set transaction status
      setTransaction({
        pokemonId: pokemon.id,
        status: 'listing'
      });
      
      // Simulate blockchain transaction
      const result = await simulateBlockchainTransaction('list', pokemon, wallet.address);
      
      if (result.success) {
        // Update the NFT status in our local state
        setMyNFTs(prev => 
          prev.map(nft => 
            nft.id === pokemon.id
              ? { ...nft, price: parseFloat(price), isListed: true }
              : nft
          )
        );
        
        // Update in localStorage for persistence in demo
        const allNFTs = JSON.parse(localStorage.getItem('pokemonNFTs') || '[]');
        localStorage.setItem('pokemonNFTs', JSON.stringify(
          allNFTs.map((nft: PokemonNFT) => 
            nft.id === pokemon.id
              ? { ...nft, price: parseFloat(price), isListed: true }
              : nft
          )
        ));
        
        // Set transaction status to completed
        setTransaction({
          pokemonId: pokemon.id,
          status: 'completed'
        });
        
        // Reset transaction status after showing completion
        setTimeout(() => {
          setTransaction({
            pokemonId: null,
            status: null
          });
        }, 2000);
      }
    } catch (err) {
      console.error("Error listing NFT:", err);
      setError('Failed to list NFT for sale. Please try again.');
      setTransaction({
        pokemonId: null,
        status: null
      });
    }
  };

  // Render not connected state
  if (!wallet.address) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Your NFT Collection</h1>
            <p className="text-gray-600 mb-6">
              Connect your wallet to view your Pokémon NFT collection
            </p>
            <div className="mt-6">
              <Link
                to="/marketplace"
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your NFT Collection</h1>
          <p className="mt-2 text-gray-600">
            Manage your owned Pokémon NFTs and list them for sale
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600">Loading your collection...</span>
          </div>
        ) : (
          <>
            {/* No NFTs State */}
            {myNFTs.length === 0 ? (
              <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Pokémon NFTs Yet</h3>
                <p className="text-gray-600 mb-6">
                  You don't own any Pokémon NFTs yet. Visit the marketplace to start your collection!
                </p>
                <Link
                  to="/marketplace"
                  className="inline-block px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <>
                {/* Collection Stats */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-500">Total NFTs</p>
                      <p className="text-2xl font-bold">{myNFTs.length}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-500">Listed for Sale</p>
                      <p className="text-2xl font-bold">
                        {myNFTs.filter(nft => nft.isListed).length}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-500">Legendary</p>
                      <p className="text-2xl font-bold">
                        {myNFTs.filter(nft => nft.rarity === 'Legendary').length}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-500">Collection Value</p>
                      <p className="text-2xl font-bold">
                        {myNFTs.reduce((total, nft) => total + nft.price, 0).toFixed(3)} ETH
                      </p>
                    </div>
                  </div>
                </div>

                {/* NFT Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myNFTs.map((pokemon) => (
                    <PokemonCard
                      key={pokemon.id}
                      pokemon={pokemon}
                      onList={handleListForSale}
                      transaction={transaction.pokemonId === pokemon.id ? transaction : undefined}
                      showListingOption={!pokemon.isListed}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyCollection;