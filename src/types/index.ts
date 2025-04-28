// Core Pokemon NFT type
export interface PokemonNFT {
  id: number;
  name: string;
  image: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  price: number;
  owner: string | null;
  isListed: boolean;
  tokenId?: number; // The actual NFT token ID on blockchain
}

// Transaction status type
export interface TransactionStatus {
  pokemonId: number | null;
  status: 'approving' | 'purchasing' | 'listing' | 'minting' | 'completed' | null;
  txHash?: string;
}

// User wallet state
export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  networkName: string | null; // Added network name field
}

// Market item for the NFT marketplace
export interface MarketItem {
  tokenId: number;
  seller: string;
  owner: string;
  price: string;
  sold: boolean;
}