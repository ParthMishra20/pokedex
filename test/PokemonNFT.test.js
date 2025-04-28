const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonNFT", function () {
  let PokemonNFT;
  let pokemonNFT;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get contract factory and signers
    PokemonNFT = await ethers.getContractFactory("PokemonNFT");
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract
    pokemonNFT = await PokemonNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await pokemonNFT.name()).to.equal("PokemonNFT");
      expect(await pokemonNFT.symbol()).to.equal("PKMN");
    });

    it("Should set the right owner", async function () {
      expect(await pokemonNFT.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should mint a new Pokemon NFT correctly", async function () {
      const tokenURI = "ipfs://QmExample";
      const pokemonId = 25; // Pikachu
      const name = "Pikachu";
      const rarity = "Rare";
      const shiny = false;
      
      const mintTx = await pokemonNFT.mintPokemon(
        addr1.address,
        tokenURI,  // This was renamed to "uri" in the contract but works the same
        pokemonId,
        name,
        rarity,
        shiny
      );
      
      const receipt = await mintTx.wait();
      const event = receipt.events.find(e => e.event === 'PokemonMinted');
      const tokenId = event.args.tokenId;
      
      // Check token ownership
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(addr1.address);
      
      // Check token URI
      expect(await pokemonNFT.tokenURI(tokenId)).to.equal(tokenURI);
      
      // Check Pokemon details
      const details = await pokemonNFT.getPokemonDetails(tokenId);
      expect(details.id).to.equal(pokemonId);
      expect(details.name).to.equal(name);
      expect(details.rarity).to.equal(rarity);
      expect(details.shiny).to.equal(shiny);
    });
    
    it("Should fail to get details for nonexistent token", async function () {
      await expect(pokemonNFT.getPokemonDetails(999)).to.be.revertedWith(
        "PokemonNFT: Query for nonexistent token"
      );
    });
  });
  
  describe("Token enumeration", function () {
    beforeEach(async function () {
      // Mint some NFTs to addr1
      for (let i = 1; i <= 3; i++) {
        await pokemonNFT.mintPokemon(
          addr1.address,
          `ipfs://QmExample${i}`,
          i,
          `Pokemon ${i}`,
          "Common",
          false
        );
      }
      
      // Mint one to addr2
      await pokemonNFT.mintPokemon(
        addr2.address,
        "ipfs://QmExampleAddr2",
        150,
        "Mewtwo",
        "Legendary",
        false
      );
    });
    
    it("Should return correct token balance", async function () {
      expect(await pokemonNFT.balanceOf(addr1.address)).to.equal(3);
      expect(await pokemonNFT.balanceOf(addr2.address)).to.equal(1);
    });
    
    it("Should return all tokens owned by an address", async function () {
      const addr1Tokens = await pokemonNFT.getTokensOfOwner(addr1.address);
      expect(addr1Tokens.length).to.equal(3);
      
      // The token IDs should be 1, 2, 3 for addr1
      expect(addr1Tokens[0]).to.equal(1);
      expect(addr1Tokens[1]).to.equal(2);
      expect(addr1Tokens[2]).to.equal(3);
      
      const addr2Tokens = await pokemonNFT.getTokensOfOwner(addr2.address);
      expect(addr2Tokens.length).to.equal(1);
      expect(addr2Tokens[0]).to.equal(4);
    });
  });
  
  describe("Token transfers", function () {
    let tokenId;
    
    beforeEach(async function () {
      // Mint an NFT to addr1
      const mintTx = await pokemonNFT.mintPokemon(
        addr1.address,
        "ipfs://QmExample",
        25,
        "Pikachu",
        "Rare",
        false
      );
      
      const receipt = await mintTx.wait();
      const event = receipt.events.find(e => e.event === 'PokemonMinted');
      tokenId = event.args.tokenId;
    });
    
    it("Should allow transfer between addresses", async function () {
      // Transfer from addr1 to addr2
      await pokemonNFT.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId);
      
      // Check new owner
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(addr2.address);
      
      // Check balances
      expect(await pokemonNFT.balanceOf(addr1.address)).to.equal(0);
      expect(await pokemonNFT.balanceOf(addr2.address)).to.equal(1);
      
      // Check token lists
      expect((await pokemonNFT.getTokensOfOwner(addr1.address)).length).to.equal(0);
      expect((await pokemonNFT.getTokensOfOwner(addr2.address)).length).to.equal(1);
      expect((await pokemonNFT.getTokensOfOwner(addr2.address))[0]).to.equal(tokenId);
    });
    
    it("Should prevent unauthorized transfer", async function () {
      // Try to transfer from addr1 using addr2's account (without approval)
      await expect(
        pokemonNFT.connect(addr2).transferFrom(addr1.address, addr2.address, tokenId)
      ).to.be.reverted;
      
      // Should still be owned by addr1
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(addr1.address);
    });
  });
});