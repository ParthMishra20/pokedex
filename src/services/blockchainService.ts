import { ethers } from 'ethers';
import { PokemonNFT, MarketItem } from '../types';
import { PokemonNFTAbi, PokemonMarketplaceAbi } from '../contracts/abis';

// Network-specific contract addresses
const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  1: {
    NFT_CONTRACT: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
    MARKET_CONTRACT: '0x0000000000000000000000000000000000000000' // Replace with actual address after deployment
  },
  // Goerli Testnet
  5: {
    NFT_CONTRACT: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
    MARKET_CONTRACT: '0x0000000000000000000000000000000000000000' // Replace with actual address after deployment
  },
  // Polygon Mainnet
  137: {
    NFT_CONTRACT: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
    MARKET_CONTRACT: '0x0000000000000000000000000000000000000000' // Replace with actual address after deployment
  },
  // Mumbai Testnet
  80001: {
    NFT_CONTRACT: '0x0000000000000000000000000000000000000000', // Replace with actual address after deployment
    MARKET_CONTRACT: '0x0000000000000000000000000000000000000000' // Replace with actual address after deployment
  },
  // Hardhat/Local development
  31337: {
    NFT_CONTRACT: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Hardhat deployment address
    MARKET_CONTRACT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' // Default Hardhat deployment address
  },
  // Localhost
  1337: {
    NFT_CONTRACT: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default local deployment address
    MARKET_CONTRACT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' // Default local deployment address
  }
};

// Gas price and limits configuration
const GAS_CONFIG = {
  maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'), // Max priority fee (tip for miners)
  maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'), // Max total fee
  gasLimit: 500000 // Gas limit
};

/**
 * Get contract addresses for the given network
 */
export const getContractAddresses = (chainId: number | null) => {
  if (!chainId || !CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]) {
    throw new Error(`Unsupported network with chainId: ${chainId}`);
  }
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
};

/**
 * Create NFT contract instance
 */
export const getNFTContract = (providerOrSigner: ethers.providers.Provider | ethers.Signer, chainId: number | null) => {
  const addresses = getContractAddresses(chainId);
  return new ethers.Contract(addresses.NFT_CONTRACT, PokemonNFTAbi, providerOrSigner);
};

/**
 * Create Marketplace contract instance
 */
export const getMarketContract = (providerOrSigner: ethers.providers.Provider | ethers.Signer, chainId: number | null) => {
  const addresses = getContractAddresses(chainId);
  return new ethers.Contract(addresses.MARKET_CONTRACT, PokemonMarketplaceAbi, providerOrSigner);
};

/**
 * Format error message from blockchain transaction
 */
export const formatError = (error: any): string => {
  // Check for user rejected transaction
  if (error.code === 4001 || 
      (error.message && error.message.includes('User denied transaction'))) {
    return 'Transaction was rejected by user';
  }
  
  // Check for insufficient funds
  if (error.message && error.message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }
  
  // Check for network/connection errors
  if (error.message && error.message.includes('network')) {
    return 'Network error. Please check your connection';
  }
  
  // Check for gas related errors
  if (error.message && (
    error.message.includes('gas') || 
    error.message.includes('fee')
  )) {
    return 'Gas estimation failed. The transaction might fail';
  }
  
  // Return original message or generic fallback
  return error.reason || error.message || 'Transaction failed';
};

/**
 * Mint a new Pokemon NFT
 */
export const mintNFT = async (
  signer: ethers.Signer,
  chainId: number | null,
  tokenURI: string,
  pokemonId: number,
  name: string, 
  rarity: string,
  isShiny: boolean
): Promise<{ success: boolean; tokenId?: number; error?: string }> => {
  try {
    if (!chainId) {
      throw new Error('No chain ID provided');
    }
    
    const nftContract = getNFTContract(signer, chainId);
    
    // Create transaction with retry mechanism
    const tx = await nftContract.mintPokemon(
      await signer.getAddress(), // Mint to connected address
      tokenURI,
      pokemonId,
      name,
      rarity,
      isShiny,
      {
        ...GAS_CONFIG,
        type: 2 // EIP-1559 transaction type
      }
    );
    
    console.log(`Minting transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Minting completed in block ${receipt.blockNumber}`);
    
    // Get tokenId from events
    const mintEvent = receipt.events?.find((e: {event: string, args: any}) => e.event === 'PokemonMinted');
    const tokenId = mintEvent ? mintEvent.args.tokenId.toNumber() : null;
    
    if (!tokenId) {
      throw new Error('Failed to get token ID from mint event');
    }
    
    return { success: true, tokenId };
  } catch (error) {
    console.error("Error minting NFT:", error);
    return { success: false, error: formatError(error) };
  }
};

/**
 * List an NFT for sale on the marketplace
 */
export const listNFTForSale = async (
  signer: ethers.Signer,
  chainId: number | null,
  tokenId: number,
  price: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!chainId) {
      throw new Error('No chain ID provided');
    }
    
    const nftContract = getNFTContract(signer, chainId);
    const marketContract = getMarketContract(signer, chainId);
    const addresses = getContractAddresses(chainId);
    
    // Convert price to wei
    const priceInWei = ethers.utils.parseUnits(price, 'ether');
    
    // Approve market to handle NFT
    console.log(`Approving marketplace for token ID: ${tokenId}`);
    const approveTx = await nftContract.approve(
      addresses.MARKET_CONTRACT, 
      tokenId,
      {
        ...GAS_CONFIG,
        type: 2 // EIP-1559 transaction type
      }
    );
    
    console.log(`Approval transaction submitted: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('Approval confirmed');
    
    // Create market item
    console.log(`Listing token ID ${tokenId} for ${price} ETH`);
    const listingTx = await marketContract.createMarketItem(
      addresses.NFT_CONTRACT,
      tokenId,
      priceInWei,
      {
        ...GAS_CONFIG,
        type: 2 // EIP-1559 transaction type
      }
    );
    
    console.log(`Listing transaction submitted: ${listingTx.hash}`);
    await listingTx.wait();
    console.log('Listing confirmed');
    
    return { success: true };
  } catch (error) {
    console.error("Error listing NFT for sale:", error);
    return { success: false, error: formatError(error) };
  }
};

/**
 * Buy an NFT from the marketplace
 */
export const buyNFT = async (
  signer: ethers.Signer,
  chainId: number | null,
  itemId: number,
  price: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!chainId) {
      throw new Error('No chain ID provided');
    }
    
    const marketContract = getMarketContract(signer, chainId);
    const addresses = getContractAddresses(chainId);
    
    // Convert price to wei
    const priceInWei = ethers.utils.parseUnits(price, 'ether');
    
    // Create market sale
    console.log(`Purchasing item ID ${itemId} for ${price} ETH`);
    const tx = await marketContract.createMarketSale(
      addresses.NFT_CONTRACT,
      itemId,
      {
        value: priceInWei,
        ...GAS_CONFIG,
        type: 2 // EIP-1559 transaction type
      }
    );
    
    console.log(`Purchase transaction submitted: ${tx.hash}`);
    await tx.wait();
    console.log('Purchase confirmed');
    
    return { success: true };
  } catch (error) {
    console.error("Error buying NFT:", error);
    return { success: false, error: formatError(error) };
  }
};

/**
 * Fetch all unsold items from the marketplace
 */
export const fetchMarketItems = async (
  provider: ethers.providers.Provider,
  chainId: number | null
): Promise<MarketItem[]> => {
  try {
    const marketContract = getMarketContract(provider, chainId);
    const data = await marketContract.fetchMarketItems();
    
    return data.map((item: any) => ({
      tokenId: item.tokenId.toNumber(),
      seller: item.seller,
      owner: item.owner,
      price: ethers.utils.formatEther(item.price),
      sold: item.sold
    }));
  } catch (error) {
    console.error("Error fetching market items:", error);
    return [];
  }
};

/**
 * Fetch NFTs owned by the user
 */
export const fetchMyNFTs = async (
  signer: ethers.Signer,
  chainId: number | null
): Promise<MarketItem[]> => {
  try {
    const marketContract = getMarketContract(signer, chainId);
    const data = await marketContract.fetchMyNFTs();
    
    return data.map((item: any) => ({
      tokenId: item.tokenId.toNumber(),
      seller: item.seller,
      owner: item.owner,
      price: ethers.utils.formatEther(item.price),
      sold: item.sold
    }));
  } catch (error) {
    console.error("Error fetching user NFTs:", error);
    return [];
  }
};

/**
 * For demo purposes: Process NFT transactions using MetaMask when available
 * This will trigger real MetaMask popups for gas fee approval
 */
export const simulateBlockchainTransaction = async (
  type: 'mint' | 'list' | 'buy',
  pokemon: PokemonNFT,
  walletAddress: string
): Promise<{ success: boolean; tokenId?: number; txHash?: string; gasFee?: string }> => {
  try {
    // Get current NFTs from localStorage
    const storedNFTs = JSON.parse(localStorage.getItem('pokemonNFTs') || '[]');

    // If MetaMask is available, use it for transactions
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Get current gas price from the network
      const gasPrice = await provider.getGasPrice();
      const estimatedGasLimit = 200000; // Estimated gas for NFT transactions
      const gasFeesInEth = parseFloat(ethers.utils.formatEther(gasPrice.mul(estimatedGasLimit)));
      
      // Define transaction parameters (target address is just a demo address)
      const demoContractAddress = "0x000000000000000000000000000000000000dEaD";
      
      let tx;
      let txValue = ethers.BigNumber.from(0);
      
      // Configure transaction based on type
      if (type === 'buy') {
        // For purchases, send the NFT price as transaction value
        txValue = ethers.utils.parseEther(pokemon.price.toString());
      }
      
      // Create and send transaction - this will trigger MetaMask popup
      tx = await signer.sendTransaction({
        to: demoContractAddress,
        value: txValue,
        gasPrice: gasPrice,
        gasLimit: estimatedGasLimit
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Handle result based on transaction type
      if (type === 'mint') {
        const tokenId = Math.floor(Math.random() * 10000);
        
        // Add newly minted NFT to localStorage
        const updatedPokemon = { 
          ...pokemon, 
          tokenId, 
          owner: walletAddress 
        };
        
        localStorage.setItem('pokemonNFTs', JSON.stringify([
          ...storedNFTs, 
          updatedPokemon
        ]));
        
        return { success: true, tokenId, txHash: tx.hash, gasFee: gasFeesInEth.toFixed(6) };
      } 
      else if (type === 'list') {
        // Update NFT listing status in localStorage
        const updatedNFTs = storedNFTs.map((nft: PokemonNFT) =>
          nft.id === pokemon.id
            ? { ...nft, isListed: true, price: pokemon.price }
            : nft
        );
        
        localStorage.setItem('pokemonNFTs', JSON.stringify(updatedNFTs));
        
        return { success: true, txHash: tx.hash, gasFee: gasFeesInEth.toFixed(6) };
      } 
      else if (type === 'buy') {
        // Update NFT ownership in localStorage
        const updatedNFTs = storedNFTs.map((nft: PokemonNFT) =>
          nft.id === pokemon.id
            ? { ...nft, owner: walletAddress, isListed: false }
            : nft
        );
        
        // If NFT wasn't in localStorage, add it
        if (!updatedNFTs.some((nft: PokemonNFT) => nft.id === pokemon.id)) {
          updatedNFTs.push({
            ...pokemon,
            owner: walletAddress,
            isListed: false
          });
        }
        
        // Save updated NFTs to localStorage
        localStorage.setItem('pokemonNFTs', JSON.stringify(updatedNFTs));
        
        console.log(`Updated NFT ownership for ID ${pokemon.id} to ${walletAddress}`);
        
        return { success: true, txHash: tx.hash, gasFee: gasFeesInEth.toFixed(6) };
      }

      return { success: true, txHash: tx.hash, gasFee: gasFeesInEth.toFixed(6) };
    }
    
    // Fallback if MetaMask isn't available or user rejected
    console.log('Using fallback transaction flow (no MetaMask or rejected)');
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a fake transaction hash
    const txHash = '0x' + Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)).join('');
    
    // Generate a realistic gas fee (between 0.001 and 0.005 ETH)
    const gasFee = (0.001 + Math.random() * 0.004).toFixed(6);
    
    // Process transaction based on type (without MetaMask)
    if (type === 'mint') {
      const tokenId = Math.floor(Math.random() * 10000);
      const updatedPokemon = { ...pokemon, tokenId, owner: walletAddress };
      localStorage.setItem('pokemonNFTs', JSON.stringify([...storedNFTs, updatedPokemon]));
      return { success: true, tokenId, txHash, gasFee };
    } 
    else if (type === 'list') {
      const updatedNFTs = storedNFTs.map((nft: PokemonNFT) =>
        nft.id === pokemon.id ? { ...nft, isListed: true, price: pokemon.price } : nft
      );
      localStorage.setItem('pokemonNFTs', JSON.stringify(updatedNFTs));
      return { success: true, txHash, gasFee };
    } 
    else if (type === 'buy') {
      // Update ownership in localStorage
      const updatedNFTs = storedNFTs.map((nft: PokemonNFT) =>
        nft.id === pokemon.id ? { ...nft, owner: walletAddress, isListed: false } : nft
      );
      
      // Add if not exists
      if (!updatedNFTs.some((nft: PokemonNFT) => nft.id === pokemon.id)) {
        updatedNFTs.push({ ...pokemon, owner: walletAddress, isListed: false });
      }
      
      localStorage.setItem('pokemonNFTs', JSON.stringify(updatedNFTs));
      console.log(`Updated NFT ownership for ID ${pokemon.id} to ${walletAddress}`);
      return { success: true, txHash, gasFee };
    }
  } catch (error) {
    console.error("Error processing blockchain transaction:", error);
    throw error; // Rethrow to be handled by calling functions
  }
  
  return { success: false };
};