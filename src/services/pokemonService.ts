import { PokemonNFT } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';
const RARITY_MAPPING = {
  legendary: 'Legendary',
  mythical: 'Epic',
  // Basic mapping based on base_experience
  // Will be adjusted in the fetchPokemonDetails function
  default: 'Common'
};

/**
 * Fetch a list of Pokemon with pagination
 */
export const fetchPokemonList = async (limit: number = 12, offset: number = 0): Promise<string[]> => {
  try {
    const response = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    return data.results.map((pokemon: any) => pokemon.name);
  } catch (error) {
    console.error('Error fetching Pokemon list:', error);
    throw new Error('Failed to fetch Pokemon list');
  }
};

/**
 * Determine Pokemon rarity based on various factors
 */
const determinePokemonRarity = (pokemon: any): 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' => {
  // Check if it's legendary or mythical
  if (pokemon.is_legendary) return 'Legendary';
  if (pokemon.is_mythical) return 'Epic';
  
  // For others, determine based on base_experience
  const baseExperience = pokemon.base_experience || 50;
  
  if (baseExperience > 300) return 'Rare';
  if (baseExperience > 200) return 'Uncommon';
  return 'Common';
};

/**
 * Calculate an NFT price based on Pokemon rarity and stats
 */
const calculateNFTPrice = (rarity: string, baseExperience: number): number => {
  const rarityMultiplier = {
    'Common': 0.01,
    'Uncommon': 0.05,
    'Rare': 0.15,
    'Epic': 0.5,
    'Legendary': 1.5
  }[rarity] || 0.01;
  
  // Calculate price based on rarity and base_experience
  const calculatedPrice = (baseExperience || 50) * rarityMultiplier / 100;
  
  // Ensure minimum price and round to 3 decimals
  return Math.max(0.001, parseFloat(calculatedPrice.toFixed(3)));
};

/**
 * Fetch detailed information for a specific Pokemon
 */
export const fetchPokemonDetails = async (nameOrId: string | number): Promise<PokemonNFT> => {
  try {
    // Get basic Pokemon data
    const pokemonResponse = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
    const pokemonData = await pokemonResponse.json();
    
    // Get species data for rarity information
    const speciesResponse = await fetch(pokemonData.species.url);
    const speciesData = await speciesResponse.json();
    
    const rarity = determinePokemonRarity(speciesData);
    const price = calculateNFTPrice(rarity, pokemonData.base_experience);
    
    return {
      id: pokemonData.id,
      name: pokemonData.name,
      image: pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default,
      rarity: rarity as any,
      types: pokemonData.types.map((type: any) => type.type.name),
      stats: {
        hp: pokemonData.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
        attack: pokemonData.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
        defense: pokemonData.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
        specialAttack: pokemonData.stats.find((s: any) => s.stat.name === 'special-attack')?.base_stat || 0,
        specialDefense: pokemonData.stats.find((s: any) => s.stat.name === 'special-defense')?.base_stat || 0,
        speed: pokemonData.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 0,
      },
      price,
      owner: null,
      isListed: true, // Always set to true so all NFTs are for sale
    };
  } catch (error) {
    console.error(`Error fetching Pokemon details for ${nameOrId}:`, error);
    throw new Error(`Failed to fetch Pokemon details for ${nameOrId}`);
  }
};

/**
 * Fetch multiple Pokemon details in parallel
 */
export const fetchBulkPokemonDetails = async (namesOrIds: (string | number)[]): Promise<PokemonNFT[]> => {
  try {
    return await Promise.all(namesOrIds.map(nameOrId => fetchPokemonDetails(nameOrId)));
  } catch (error) {
    console.error('Error fetching bulk Pokemon details:', error);
    throw new Error('Failed to fetch bulk Pokemon details');
  }
};