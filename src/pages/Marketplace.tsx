import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, AlertCircle, Loader2 } from 'lucide-react';
import { PokemonNFT, TransactionStatus } from '../types';
import { fetchPokemonList, fetchBulkPokemonDetails } from '../services/pokemonService';
import { simulateBlockchainTransaction } from '../services/blockchainService';
import PokemonCard from '../components/PokemonCard';
import { useWallet } from '../contexts/WalletContext';

const Marketplace: React.FC = () => {
  const { wallet } = useWallet();
  const [pokemonNFTs, setPokemonNFTs] = useState<PokemonNFT[]>([]);
  const [filteredNFTs, setFilteredNFTs] = useState<PokemonNFT[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<TransactionStatus>({
    pokemonId: null,
    status: null
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 12;
  
  // Helper function to get available types from the NFTs
  const getAvailableTypes = () => {
    const allTypes = pokemonNFTs.flatMap(pokemon => pokemon.types);
    return [...new Set(allTypes)];
  };

  // Fetch initial Pokemon data
  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        setLoading(true);
        // Get list of Pokemon names
        const pokemonNames = await fetchPokemonList(limit, offset);
        
        // Get detailed info for each Pokemon
        const pokemonDetails = await fetchBulkPokemonDetails(pokemonNames);
        
        setPokemonNFTs(prev => [...prev, ...pokemonDetails]);
        setFilteredNFTs(prev => [...prev, ...pokemonDetails]);
        setHasMore(pokemonNames.length === limit);
        setError(null);
      } catch (err) {
        setError('Failed to load Pokémon NFTs. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, [offset]);

  // Filter Pokemon based on search and filters
  useEffect(() => {
    let filtered = [...pokemonNFTs];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply rarity filter
    if (rarityFilter) {
      filtered = filtered.filter(pokemon => pokemon.rarity === rarityFilter);
    }
    
    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter(pokemon => 
        pokemon.types.some(type => type === typeFilter)
      );
    }
    
    setFilteredNFTs(filtered);
  }, [searchTerm, rarityFilter, typeFilter, pokemonNFTs]);

  // Handle purchase of a Pokemon NFT
  const handlePurchase = async (pokemon: PokemonNFT) => {
    if (!wallet.address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      // Set transaction status to approving
      setTransaction({
        pokemonId: pokemon.id,
        status: 'approving'
      });
      
      // Simulate blockchain delay for approval
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Set transaction status to purchasing
      setTransaction({
        pokemonId: pokemon.id,
        status: 'purchasing'
      });
      
      // Simulate blockchain transaction including gas fees
      const result = await simulateBlockchainTransaction('buy', pokemon, wallet.address);
      
      if (result.success) {
        // Update Pokemon ownership in our state
        setPokemonNFTs(prevNFTs =>
          prevNFTs.map(nft =>
            nft.id === pokemon.id
              ? { ...nft, owner: wallet.address, isListed: false }
              : nft
          )
        );
        
        // Display gas fee information
        const gasFeeNotification = result.gasFee 
          ? `Transaction successful! Gas fee: ${result.gasFee} ETH`
          : 'Transaction successful!';
          
        // Set transaction status to completed with gas info
        setTransaction({
          pokemonId: pokemon.id,
          status: 'completed',
          txHash: result.txHash
        });
        
        // Show success notification
        console.log(gasFeeNotification);
        
        // Reset transaction status after showing completion
        setTimeout(() => {
          setTransaction({
            pokemonId: null,
            status: null
          });
        }, 3000);
      }
    } catch (err) {
      console.error("Error purchasing NFT:", err);
      setError('Transaction failed. Please try again.');
      setTransaction({
        pokemonId: null,
        status: null
      });
    }
  };

  // Load more Pokemon when user scrolls to bottom
  const loadMore = () => {
    if (!loading && hasMore) {
      setOffset(prev => prev + limit);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pokémon NFT Marketplace</h1>
          <p className="mt-2 text-gray-600">
            Browse and collect unique Pokémon NFTs from our marketplace
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search Pokémon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRarityFilter('');
                  setTypeFilter('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {/* Expanded Filter Options */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="rarity-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Rarity
                </label>
                <select
                  id="rarity-filter"
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Rarities</option>
                  <option value="Common">Common</option>
                  <option value="Uncommon">Uncommon</option>
                  <option value="Rare">Rare</option>
                  <option value="Epic">Epic</option>
                  <option value="Legendary">Legendary</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Types</option>
                  {getAvailableTypes().map(type => (
                    <option key={type} value={type} className="capitalize">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Status</option>
                  <option value="forSale">For Sale</option>
                  <option value="notForSale">Not For Sale</option>
                  <option value="owned">Owned by Me</option>
                </select>
              </div>
            </div>
          )}
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

        {/* NFT Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((pokemon) => (
            <PokemonCard
              key={pokemon.id}
              pokemon={pokemon}
              onPurchase={handlePurchase}
              transaction={transaction.pokemonId === pokemon.id ? transaction : undefined}
            />
          ))}
        </div>

        {/* Loading More / No Results */}
        <div className="mt-8 text-center">
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Loading Pokémon NFTs...</span>
            </div>
          ) : filteredNFTs.length === 0 ? (
            <p className="text-gray-500">No Pokémon NFTs found matching your search criteria.</p>
          ) : hasMore ? (
            <button
              onClick={loadMore}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Load More
            </button>
          ) : (
            <p className="text-gray-500">You've reached the end of the marketplace!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;