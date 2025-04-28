import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Loader2, ArrowLeft, Info, Shield, Zap, Heart, BarChart3, ChevronRight } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { PokemonNFT, TransactionStatus } from '../types';
import { fetchPokemonDetails } from '../services/pokemonService';

interface Evolution {
  name: string;
  id: number;
  image: string;
}

interface PokemonSpecies {
  description: string;
  evolutions: Evolution[];
  genus: string;
}

const PokemonDetail: React.FC = () => {
  const { id: pokemonIdParam } = useParams<{ id: string }>();
  const pokemonId = parseInt(pokemonIdParam || '0', 10);
  const navigate = useNavigate();
  const { wallet } = useWallet();
  
  const [pokemon, setPokemon] = useState<PokemonNFT | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionStatus>({
    pokemonId: null,
    status: null
  });

  // Fetch Pokemon details and species data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check if we have this NFT in localStorage first
        const storedNFTs = JSON.parse(localStorage.getItem('pokemonNFTs') || '[]');
        const storedNFT = storedNFTs.find((nft: PokemonNFT) => nft.id === pokemonId);
        
        // Fetch fresh Pokemon data
        const fetchedPokemon = storedNFT || await fetchPokemonDetails(pokemonId);
        setPokemon(fetchedPokemon);
        
        // Fetch species data including evolution chain
        const speciesData = await fetchPokemonSpecies(pokemonId);
        setSpecies(speciesData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching Pokemon details:', err);
        setError('Failed to load Pokemon details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [pokemonId]);

  // Fetch Pokemon species data and evolution chain
  const fetchPokemonSpecies = async (id: number): Promise<PokemonSpecies> => {
    // Get species data
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const speciesData = await speciesResponse.json();
    
    // Get English flavor text (description)
    const englishFlavorText = speciesData.flavor_text_entries
      .find((entry: any) => entry.language.name === 'en')?.flavor_text || 'No description available.';
    
    // Get English genus (category)
    const englishGenus = speciesData.genera
      .find((genus: any) => genus.language.name === 'en')?.genus || '';
    
    // Get evolution chain
    const evolutionResponse = await fetch(speciesData.evolution_chain.url);
    const evolutionData = await evolutionResponse.json();
    
    // Process evolution chain
    const evolutions: Evolution[] = [];
    let evoData = evolutionData.chain;
    
    // Process first form
    if (evoData.species) {
      const speciesId = extractIdFromUrl(evoData.species.url);
      const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesId}`);
      const pokemonData = await pokemonResponse.json();
      
      evolutions.push({
        name: evoData.species.name,
        id: speciesId,
        image: pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default
      });
    }
    
    // Process evolutions
    while (evoData.evolves_to && evoData.evolves_to.length > 0) {
      evoData = evoData.evolves_to[0];
      if (evoData.species) {
        const speciesId = extractIdFromUrl(evoData.species.url);
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesId}`);
        const pokemonData = await pokemonResponse.json();
        
        evolutions.push({
          name: evoData.species.name,
          id: speciesId,
          image: pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default
        });
      }
    }
    
    return {
      description: englishFlavorText.replace(/\f|\n|\r/g, ' '),
      genus: englishGenus,
      evolutions
    };
  };

  // Helper to extract ID from URL
  const extractIdFromUrl = (url: string): number => {
    const matches = url.match(/\/([0-9]+)\/?$/);
    return matches ? parseInt(matches[1], 10) : 0;
  };

  // Handle purchase with MetaMask
  const handlePurchase = async () => {
    if (!wallet.address || !pokemon) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      // Set transaction status to approving - this will show "waiting for wallet confirmation"
      setTransaction({
        pokemonId: pokemon.id,
        status: 'approving'
      });
      
      // Request actual transaction from MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Calculate gas based on current network conditions
      const gasPrice = await provider.getGasPrice();
      const estimatedGasLimit = 200000; // Estimated gas for an NFT purchase
      
      // Create transaction parameters with proper gas settings
      const txParams = {
        to: "0x000000000000000000000000000000000000dEaD", // Demo contract address
        value: ethers.utils.parseEther(pokemon.price.toString()),
        gasPrice: gasPrice,
        gasLimit: estimatedGasLimit
      };
      
      // Send transaction - this will trigger MetaMask popup
      const tx = await signer.sendTransaction(txParams);
      
      // Transaction sent - now in purchasing state
      setTransaction({
        pokemonId: pokemon.id,
        status: 'purchasing',
        txHash: tx.hash
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Transaction confirmed - update NFT ownership in localStorage
      const storedNFTs = JSON.parse(localStorage.getItem('pokemonNFTs') || '[]');
      const updatedNFTs = storedNFTs.map((nft: PokemonNFT) => 
        nft.id === pokemon.id
          ? { ...nft, owner: wallet.address, isListed: false }
          : nft
      );
      
      // If NFT wasn't in localStorage yet, add it
      if (!updatedNFTs.some((nft: PokemonNFT) => nft.id === pokemon.id)) {
        updatedNFTs.push({
          ...pokemon,
          owner: wallet.address,
          isListed: false
        });
      }
      
      // Save updated NFTs to localStorage
      localStorage.setItem('pokemonNFTs', JSON.stringify(updatedNFTs));
      
      // Update current Pokemon state
      setPokemon({
        ...pokemon,
        owner: wallet.address,
        isListed: false
      });
      
      // Set transaction status to completed
      setTransaction({
        pokemonId: pokemon.id,
        status: 'completed',
        txHash: tx.hash
      });
      
      // Reset transaction status after showing completion
      setTimeout(() => {
        setTransaction({
          pokemonId: null,
          status: null
        });
      }, 5000);
      
    } catch (err: any) {
      console.error("Error purchasing NFT:", err);
      
      // Check if user rejected transaction
      if (err.code === 4001 || (err.message && err.message.includes('User denied'))) {
        setError('Transaction rejected by user');
      } else {
        setError('Transaction failed. Please try again.');
      }
      
      setTransaction({
        pokemonId: null,
        status: null
      });
    }
  };
  
  // Determine if current user is the owner
  const isOwner = pokemon && wallet.address && pokemon.owner === wallet.address;

  // Helper function to get color for type badge
  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      normal: 'bg-gray-200 text-gray-800',
      fire: 'bg-orange-100 text-orange-800',
      water: 'bg-blue-100 text-blue-800',
      electric: 'bg-yellow-100 text-yellow-800',
      grass: 'bg-green-100 text-green-800',
      ice: 'bg-cyan-100 text-cyan-800',
      fighting: 'bg-red-100 text-red-800',
      poison: 'bg-purple-100 text-purple-800',
      ground: 'bg-amber-100 text-amber-800',
      flying: 'bg-indigo-100 text-indigo-800',
      psychic: 'bg-pink-100 text-pink-800',
      bug: 'bg-lime-100 text-lime-800',
      rock: 'bg-stone-100 text-stone-800',
      ghost: 'bg-violet-100 text-violet-800',
      dragon: 'bg-fuchsia-100 text-fuchsia-800',
      dark: 'bg-gray-800 text-gray-100',
      steel: 'bg-slate-200 text-slate-800',
      fairy: 'bg-rose-100 text-rose-800',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to format stat bar width
  const getStatBarWidth = (stat: number) => {
    // Max base stat is approximately 255
    const percentage = Math.min((stat / 255) * 100, 100);
    return `${percentage}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mr-3" />
            <span className="text-xl text-gray-700">Loading Pokemon details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pokemon) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">{error || 'Failed to load Pokemon data'}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CSS class for rarity badge
  const rarityClass = {
    'Legendary': 'bg-yellow-100 text-yellow-800',
    'Epic': 'bg-purple-100 text-purple-800',
    'Rare': 'bg-blue-100 text-blue-800',
    'Uncommon': 'bg-green-100 text-green-800',
    'Common': 'bg-gray-100 text-gray-800',
  }[pokemon.rarity] || 'bg-gray-100 text-gray-800';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Marketplace
          </button>
        </div>
        
        {/* Pokemon Details Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="md:flex">
            {/* Left Column - Image */}
            <div className="md:w-2/5 relative">
              <div className="h-full flex items-center justify-center bg-gray-50 p-8">
                <img
                  src={pokemon.image}
                  alt={pokemon.name}
                  className="max-h-96 object-contain"
                />
              </div>
              
              {/* Transaction Status Overlay */}
              {transaction.pokemonId === pokemon.id && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white p-6">
                  {transaction.status === 'approving' && (
                    <>
                      <Loader2 className="h-16 w-16 text-blue-400 animate-spin mb-4" />
                      <p className="text-xl font-bold mb-2">Waiting for Confirmation</p>
                      <p className="text-center text-gray-300 mb-4">
                        Confirm this transaction in your wallet
                      </p>
                      <div className="mt-2 px-4 py-2 bg-blue-900 rounded-full text-sm">
                        <span>Approve in MetaMask</span>
                      </div>
                    </>
                  )}
                  
                  {transaction.status === 'purchasing' && (
                    <>
                      <Loader2 className="h-16 w-16 text-blue-400 animate-spin mb-4" />
                      <p className="text-xl font-bold mb-2">Processing Transaction</p>
                      <p className="text-center text-gray-300 mb-2">
                        Your transaction is being processed
                      </p>
                      {transaction.txHash && (
                        <p className="text-xs max-w-xs truncate mb-4">
                          TX: {transaction.txHash.substring(0, 8)}...{transaction.txHash.slice(-6)}
                        </p>
                      )}
                      <div className="mt-2 px-4 py-2 bg-blue-900 rounded-full text-sm animate-pulse">
                        <span>⚡ Writing to blockchain</span>
                      </div>
                    </>
                  )}
                  
                  {transaction.status === 'completed' && (
                    <>
                      <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-xl font-bold mb-2">Transaction Complete!</p>
                      <p className="text-center text-gray-300 mb-2">
                        {pokemon.name} is now in your collection
                      </p>
                      <Link
                        to="/my-collection"
                        className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                      >
                        View My Collection
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Column - Details */}
            <div className="md:w-3/5 p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 capitalize mb-1">
                    {pokemon.name}
                  </h1>
                  {species && (
                    <p className="text-gray-500 mb-2">
                      {species.genus}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pokemon.types.map((type) => (
                      <span 
                        key={type} 
                        className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTypeColor(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${rarityClass}`}>
                    {pokemon.rarity}
                  </span>
                </div>
              </div>

              {/* Pokemon Description */}
              {species && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                    <Info className="h-5 w-5 mr-2 text-blue-500" />
                    About
                  </h3>
                  <p className="text-gray-700">
                    {species.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Base Stats
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">HP</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.hp}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-red-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.hp) }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">Attack</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.attack}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-orange-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.attack) }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">Defense</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.defense}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.defense) }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">Sp. Attack</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.specialAttack}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-purple-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.specialAttack) }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">Sp. Defense</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.specialDefense}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.specialDefense) }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-24">Speed</span>
                      <span className="text-sm font-medium ml-auto">{pokemon.stats.speed}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-pink-500 h-2.5 rounded-full" 
                        style={{ width: getStatBarWidth(pokemon.stats.speed) }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evolution chain */}
              {species && species.evolutions.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-500" />
                    Evolution Chain
                  </h3>
                  <div className="flex flex-wrap items-center">
                    {species.evolutions.map((evolution, index) => (
                      <React.Fragment key={evolution.id}>
                        <Link 
                          to={`/pokemon/${evolution.id}`}
                          className={`flex flex-col items-center ${evolution.id === pokemon.id ? 'bg-blue-50 p-2 rounded-lg' : ''}`}
                        >
                          <img 
                            src={evolution.image} 
                            alt={evolution.name}
                            className="w-16 h-16 object-contain"
                          />
                          <span className="text-sm capitalize mt-1">{evolution.name}</span>
                        </Link>
                        
                        {index < species.evolutions.length - 1 && (
                          <ChevronRight className="h-6 w-6 mx-3 text-gray-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Price and Purchase Button */}
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {pokemon.price} ETH
                    </p>
                  </div>
                  
                  {!isOwner && pokemon.isListed && (
                    <button
                      onClick={handlePurchase}
                      disabled={!wallet.isConnected || transaction.pokemonId === pokemon.id}
                      className={`
                        px-8 py-3 rounded-lg text-lg font-semibold flex items-center
                        ${!wallet.isConnected 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : transaction.pokemonId === pokemon.id
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'}
                      `}
                    >
                      {transaction.pokemonId === pokemon.id ? 'Processing...' : 'Purchase Now'}
                    </button>
                  )}
                  
                  {isOwner && (
                    <div className="bg-green-100 px-4 py-2 rounded-lg">
                      <span className="text-green-800 font-medium">You own this NFT</span>
                    </div>
                  )}
                  
                  {!pokemon.isListed && !isOwner && (
                    <div className="bg-gray-100 px-4 py-2 rounded-lg">
                      <span className="text-gray-500 font-medium">Not for sale</span>
                    </div>
                  )}
                </div>
                
                {!wallet.isConnected && (
                  <p className="text-sm text-gray-500 mt-2">
                    Connect your wallet to purchase this Pokemon NFT
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetail;