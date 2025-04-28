// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonNFT is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Store pokemon metadata by tokenId
    struct Pokemon {
        uint256 id;       // Pokemon ID (from PokeAPI)
        string name;
        string rarity;    // "Common", "Uncommon", "Rare", "Epic", "Legendary"
        bool shiny;       // Is this a shiny variant?
    }

    // Mapping from tokenId to Pokemon details
    mapping(uint256 => Pokemon) public pokemonDetails;

    // Events
    event PokemonMinted(uint256 indexed tokenId, address indexed owner, uint256 pokemonId, string name, string rarity, bool shiny);

    constructor() ERC721("PokemonNFT", "PKMN") {}

    /**
     * @dev Mint a new Pokemon NFT
     * @param to Address to mint the NFT to
     * @param uri IPFS URI for the NFT metadata
     * @param pokemonId Pokemon ID from PokeAPI
     * @param name Pokemon name
     * @param rarity Pokemon rarity level
     * @param shiny Whether this is a shiny variant
     */
    function mintPokemon(
        address to,
        string memory uri,
        uint256 pokemonId,
        string memory name,
        string memory rarity,
        bool shiny
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);

        // Store pokemon details
        pokemonDetails[newTokenId] = Pokemon({
            id: pokemonId,
            name: name,
            rarity: rarity,
            shiny: shiny
        });

        emit PokemonMinted(newTokenId, to, pokemonId, name, rarity, shiny);
        return newTokenId;
    }

    /**
     * @dev Get Pokemon details for a token
     * @param tokenId The token ID to get details for
     */
    function getPokemonDetails(uint256 tokenId) public view returns (
        uint256 id, 
        string memory name, 
        string memory rarity, 
        bool shiny
    ) {
        require(_exists(tokenId), "PokemonNFT: Query for nonexistent token");
        Pokemon memory pokemon = pokemonDetails[tokenId];
        return (
            pokemon.id,
            pokemon.name,
            pokemon.rarity,
            pokemon.shiny
        );
    }

    /**
     * @dev Get all tokens owned by an address
     * @param owner Address to get tokens for
     */
    function getTokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        
        uint256[] memory tokenIds = new uint256[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokenIds;
    }

    // The following functions are overrides required by Solidity
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}