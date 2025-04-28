// ABIs for PokemonNFT and PokemonMarketplace contracts
// These will be generated from contract compilation in a real project
// For now, we're providing the minimum ABI needed for our frontend

export const PokemonNFTAbi = [
  // Basic ERC721 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",

  // PokemonNFT specific functions
  "function mintPokemon(address to, string memory tokenURI, uint256 pokemonId, string memory name, string memory rarity, bool shiny) returns (uint256)",
  "function getPokemonDetails(uint256 tokenId) view returns (uint256 id, string memory name, string memory rarity, bool shiny)",
  "function getTokensOfOwner(address owner) view returns (uint256[] memory)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event PokemonMinted(uint256 indexed tokenId, address indexed owner, uint256 pokemonId, string name, string rarity, bool shiny)"
];

export const PokemonMarketplaceAbi = [
  // Marketplace functions
  "function createMarketItem(address nftContract, uint256 tokenId, uint256 price)",
  "function createMarketSale(address nftContract, uint256 itemId) payable",
  "function cancelMarketItem(uint256 itemId)",
  "function fetchMarketItems() view returns (tuple(uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold, uint256 listedAt)[])",
  "function fetchMyNFTs() view returns (tuple(uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold, uint256 listedAt)[])",
  "function fetchItemsListed() view returns (tuple(uint256 itemId, address nftContract, uint256 tokenId, address seller, address owner, uint256 price, bool sold, uint256 listedAt)[])",
  "function updateListingFeePercentage(uint256 _listingFeePercentage)",
  "function withdrawFees()",
  "function listingFeePercentage() view returns (uint256)",

  // Events
  "event MarketItemCreated(uint256 indexed itemId, address indexed nftContract, uint256 indexed tokenId, address seller, address owner, uint256 price, bool sold, uint256 listedAt)",
  "event MarketItemSold(uint256 indexed itemId, address indexed nftContract, uint256 indexed tokenId, address seller, address owner, uint256 price)"
];