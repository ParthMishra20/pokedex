import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Tag, Loader2, Bookmark, CheckCircle, Info } from 'lucide-react';
import { PokemonNFT, TransactionStatus } from '../types';
import { useWallet } from '../contexts/WalletContext';

interface PokemonCardProps {
  pokemon: PokemonNFT;
  onPurchase?: (pokemon: PokemonNFT) => Promise<void>;
  onList?: (pokemon: PokemonNFT, price: string) => Promise<void>;
  transaction?: TransactionStatus;
  showListingOption?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({
  pokemon,
  onPurchase,
  onList,
  transaction,
  showListingOption = false
}) => {
  const navigate = useNavigate();
  const { wallet } = useWallet();
  const [listingPrice, setListingPrice] = useState<string>(pokemon.price.toString());
  const [showListingForm, setShowListingForm] = useState(false);
  
  const isTransacting = transaction?.pokemonId === pokemon.id;
  const isOwnedByUser = pokemon.owner === wallet.address;
  
  // Navigate to detailed view
  const goToDetailView = () => {
    navigate(`/pokemon/${pokemon.id}`);
  };
  
  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onPurchase && pokemon.isListed) {
      onPurchase(pokemon);
    }
  };
  
  const handleListing = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card click
    if (onList && listingPrice) {
      onList(pokemon, listingPrice);
      setShowListingForm(false);
    }
  };
  
  const toggleListingForm = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowListingForm(prev => !prev);
  };
  
  // Generate rarity style based on rarity
  const rarityStyle = {
    'Legendary': 'bg-yellow-100 text-yellow-800',
    'Epic': 'bg-purple-100 text-purple-800',
    'Rare': 'bg-blue-100 text-blue-800',
    'Uncommon': 'bg-green-100 text-green-800',
    'Common': 'bg-gray-100 text-gray-800'
  }[pokemon.rarity] || 'bg-gray-100 text-gray-800';

  // Render transaction status overlay
  const renderTransactionStatus = () => {
    if (!isTransacting) return null;
    
    if (transaction?.status === 'completed') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white p-4">
          <CheckCircle className="h-12 w-12 text-green-400 mb-2" />
          <p className="text-lg font-bold">Transaction Complete!</p>
          {transaction.txHash && (
            <p className="text-xs mt-1 max-w-[200px] truncate">
              TX: {transaction.txHash.substring(0, 10)}...{transaction.txHash.slice(-8)}
            </p>
          )}
          <div className="mt-3 px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
            NFT added to your collection
          </div>
        </div>
      );
    }
    
    if (transaction?.status === 'approving') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin mb-2" />
          <p className="text-lg font-bold">Approving Transaction</p>
          <p className="text-sm mt-1">Waiting for wallet confirmation...</p>
        </div>
      );
    }
    
    if (transaction?.status === 'purchasing') {
      return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white">
          <Loader2 className="h-12 w-12 text-blue-400 animate-spin mb-2" />
          <p className="text-lg font-bold">Processing Purchase</p>
          <p className="text-sm mt-1">This may take a few moments</p>
          <div className="mt-3 px-3 py-1 bg-blue-900 rounded-full text-xs">
            <span className="animate-pulse">⚡ Writing to blockchain</span>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div 
      onClick={goToDetailView}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow relative cursor-pointer group"
    >
      <div className="relative">
        <img 
          src={pokemon.image} 
          alt={pokemon.name}
          className="w-full h-64 object-contain bg-gray-50 p-4 transition-transform group-hover:scale-105"
        />
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${rarityStyle}`}>
            {pokemon.rarity}
          </span>
        </div>
        {isOwnedByUser && (
          <div className="absolute top-4 left-4">
            <Bookmark className="h-5 w-5 text-blue-500" />
          </div>
        )}
        
        {/* View Details Button (appears on hover) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 pointer-events-none">
          <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center">
            <Info className="h-4 w-4 mr-2" />
            View Details
          </button>
        </div>
        
        {/* Transaction Status Overlay */}
        {renderTransactionStatus()}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 capitalize">
            {pokemon.name}
          </h3>
          <div className="flex flex-wrap gap-1">
            {pokemon.types.map(type => (
              <span key={type} className="flex items-center text-gray-600 text-xs capitalize bg-gray-100 px-2 py-1 rounded-full">
                <Tag className="h-3 w-3 mr-1" />
                {type}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-600">
          <div>
            <p className="text-gray-500">HP</p>
            <p className="font-semibold">{pokemon.stats.hp}</p>
          </div>
          <div>
            <p className="text-gray-500">Attack</p>
            <p className="font-semibold">{pokemon.stats.attack}</p>
          </div>
          <div>
            <p className="text-gray-500">Defense</p>
            <p className="font-semibold">{pokemon.stats.defense}</p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-lg font-semibold text-gray-900">
              {pokemon.price} ETH
            </span>
          </div>
          
          {/* Purchase Button */}
          {pokemon.isListed && !isOwnedByUser && onPurchase && (
            <button
              onClick={handlePurchase}
              disabled={!wallet.isConnected || isTransacting}
              className={`
                px-4 py-2 rounded-lg font-semibold flex items-center
                ${!wallet.isConnected 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isTransacting
                  ? 'bg-blue-100 text-blue-600 cursor-wait'
                  : 'bg-blue-500 text-white hover:bg-blue-600'}
              `}
            >
              {isTransacting && transaction?.status !== 'completed' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {transaction?.status === 'approving' ? 'Approving...' : 'Processing...'}
                </>
              ) : isTransacting && transaction?.status === 'completed' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Purchased!
                </>
              ) : (
                'Purchase'
              )}
            </button>
          )}
          
          {/* List for Sale Button/Form */}
          {isOwnedByUser && !pokemon.isListed && showListingOption && (
            <>
              {showListingForm ? (
                <form onSubmit={handleListing} onClick={e => e.stopPropagation()} className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    step="0.001"
                    min="0.001"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    placeholder="ETH"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isTransacting}
                    className={`
                      px-3 py-1 rounded-lg text-sm font-medium
                      ${isTransacting 
                        ? 'bg-blue-100 text-blue-600 cursor-wait' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'}
                    `}
                  >
                    {isTransacting ? (
                      <>
                        <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                        Listing...
                      </>
                    ) : (
                      'List'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleListingForm}
                    className="px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={toggleListingForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                >
                  List for Sale
                </button>
              )}
            </>
          )}
          
          {/* Status Labels */}
          {!pokemon.isListed && !showListingOption && (
            <span className="text-sm text-gray-500">
              {isOwnedByUser ? 'Owned by you' : 'Not for sale'}
            </span>
          )}
          
          {pokemon.isListed && isOwnedByUser && (
            <span className="text-sm text-green-500 font-medium">
              Listed for sale
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;