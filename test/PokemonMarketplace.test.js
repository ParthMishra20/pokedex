const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PokemonMarketplace", function () {
  let PokemonNFT;
  let pokemonNFT;
  let PokemonMarketplace;
  let marketplace;
  let owner;
  let seller;
  let buyer;
  let tokenId;

  beforeEach(async function () {
    // Deploy contracts before each test
    [owner, seller, buyer] = await ethers.getSigners();
    
    // Deploy PokemonNFT
    PokemonNFT = await ethers.getContractFactory("PokemonNFT");
    pokemonNFT = await PokemonNFT.deploy();
    
    // Deploy PokemonMarketplace
    PokemonMarketplace = await ethers.getContractFactory("PokemonMarketplace");
    marketplace = await PokemonMarketplace.deploy();
    
    // Mint a token to the seller for testing
    const tokenURI = "ipfs://QmExample";
    const mintTx = await pokemonNFT.mintPokemon(
      seller.address, 
      tokenURI,
      25,  // Pikachu
      "Pikachu",
      "Rare",
      false
    );
    const receipt = await mintTx.wait();
    
    // Get tokenId from the event
    const event = receipt.events.find(e => e.event === 'PokemonMinted');
    tokenId = event.args.tokenId;
    
    // Approve marketplace to transfer NFT
    await pokemonNFT.connect(seller).approve(marketplace.address, tokenId);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should have correct initial listing fee percentage", async function () {
      expect(await marketplace.listingFeePercentage()).to.equal(250);
    });
  });

  describe("Creating market item", function () {
    it("Should create a market item correctly", async function () {
      const price = ethers.utils.parseEther("1");
      
      await expect(
        marketplace.connect(seller).createMarketItem(
          pokemonNFT.address,
          tokenId,
          price
        )
      ).to.emit(marketplace, "MarketItemCreated")
        .withArgs(1, pokemonNFT.address, tokenId, seller.address, ethers.constants.AddressZero, price, false, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
      
      // The NFT should now be owned by the marketplace
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(marketplace.address);
    });

    it("Should revert if price is zero", async function () {
      await expect(
        marketplace.connect(seller).createMarketItem(
          pokemonNFT.address,
          tokenId,
          0
        )
      ).to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("Buying market item", function () {
    let itemId;
    let price;

    beforeEach(async function () {
      // List the NFT on the marketplace
      price = ethers.utils.parseEther("1");
      const listingTx = await marketplace.connect(seller).createMarketItem(
        pokemonNFT.address,
        tokenId,
        price
      );
      const receipt = await listingTx.wait();
      
      // Get the itemId
      const event = receipt.events.find(e => e.event === 'MarketItemCreated');
      itemId = event.args.itemId;
    });

    it("Should transfer ownership and pay seller when buying", async function () {
      // Get initial balances
      const initialSellerBalance = await ethers.provider.getBalance(seller.address);
      
      // Buy the NFT
      await expect(
        marketplace.connect(buyer).createMarketSale(
          pokemonNFT.address,
          itemId,
          { value: price }
        )
      ).to.emit(marketplace, "MarketItemSold");
      
      // The NFT should now be owned by the buyer
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(buyer.address);
      
      // Calculate seller's expected proceeds
      const listingFee = price.mul(250).div(10000); // 2.5%
      const sellerProceeds = price.sub(listingFee);
      
      // Verify seller received payment
      const finalSellerBalance = await ethers.provider.getBalance(seller.address);
      expect(finalSellerBalance).to.equal(initialSellerBalance.add(sellerProceeds));
    });

    it("Should revert if not enough ETH is sent", async function () {
      const insufficientPrice = ethers.utils.parseEther("0.9");
      
      await expect(
        marketplace.connect(buyer).createMarketSale(
          pokemonNFT.address,
          itemId,
          { value: insufficientPrice }
        )
      ).to.be.revertedWith("Please submit the asking price");
    });

    it("Should revert if item is already sold", async function () {
      // First purchase
      await marketplace.connect(buyer).createMarketSale(
        pokemonNFT.address,
        itemId,
        { value: price }
      );
      
      // Try to purchase again
      await expect(
        marketplace.connect(buyer).createMarketSale(
          pokemonNFT.address,
          itemId,
          { value: price }
        )
      ).to.be.revertedWith("Item already sold");
    });
  });

  describe("Canceling market item", function () {
    let itemId;

    beforeEach(async function () {
      // List the NFT on the marketplace
      const price = ethers.utils.parseEther("1");
      const listingTx = await marketplace.connect(seller).createMarketItem(
        pokemonNFT.address,
        tokenId,
        price
      );
      const receipt = await listingTx.wait();
      
      // Get the itemId
      const event = receipt.events.find(e => e.event === 'MarketItemCreated');
      itemId = event.args.itemId;
    });

    it("Should allow seller to cancel listing", async function () {
      // Cancel the listing
      await marketplace.connect(seller).cancelMarketItem(itemId);
      
      // The NFT should be returned to seller
      expect(await pokemonNFT.ownerOf(tokenId)).to.equal(seller.address);
      
      // The listing should be deleted (checking by trying to buy it)
      await expect(
        marketplace.connect(buyer).createMarketSale(
          pokemonNFT.address,
          itemId,
          { value: ethers.utils.parseEther("1") }
        )
      ).to.be.reverted;
    });

    it("Should revert if non-seller tries to cancel", async function () {
      await expect(
        marketplace.connect(buyer).cancelMarketItem(itemId)
      ).to.be.revertedWith("Only seller can cancel listing");
    });
  });

  describe("Marketplace fee management", function () {
    it("Should allow owner to update listing fee", async function () {
      await marketplace.connect(owner).updateListingFeePercentage(300);
      expect(await marketplace.listingFeePercentage()).to.equal(300);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      await expect(
        marketplace.connect(buyer).updateListingFeePercentage(300)
      ).to.be.reverted;
    });

    it("Should revert if fee is too high", async function () {
      await expect(
        marketplace.connect(owner).updateListingFeePercentage(1100)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should allow owner to withdraw fees", async function () {
      // First, create a sale to generate fees
      const price = ethers.utils.parseEther("1");
      
      // List the NFT
      const listingTx = await marketplace.connect(seller).createMarketItem(
        pokemonNFT.address,
        tokenId,
        price
      );
      const receipt = await listingTx.wait();
      const event = receipt.events.find(e => e.event === 'MarketItemCreated');
      const itemId = event.args.itemId;
      
      // Buy the NFT
      await marketplace.connect(buyer).createMarketSale(
        pokemonNFT.address,
        itemId,
        { value: price }
      );
      
      // Check marketplace balance
      const marketplaceBalance = await ethers.provider.getBalance(marketplace.address);
      expect(marketplaceBalance).to.be.gt(0);
      
      // Get initial owner balance
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      // Withdraw fees
      const withdrawTx = await marketplace.connect(owner).withdrawFees();
      const withdrawReceipt = await withdrawTx.wait();
      const gasUsed = withdrawReceipt.gasUsed.mul(withdrawReceipt.effectiveGasPrice);
      
      // Check owner received fees
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance.add(marketplaceBalance).sub(gasUsed));
      
      // Marketplace should have zero balance
      expect(await ethers.provider.getBalance(marketplace.address)).to.equal(0);
    });
  });

  describe("Fetching market items", function () {
    beforeEach(async function () {
      // Create multiple listings
      const price = ethers.utils.parseEther("1");
      
      // Mint more NFTs
      for (let i = 0; i < 3; i++) {
        const mintTx = await pokemonNFT.mintPokemon(
          seller.address,
          `ipfs://QmExample${i}`,
          i + 1,
          `Pokemon ${i}`,
          "Common",
          false
        );
        const receipt = await mintTx.wait();
        const event = receipt.events.find(e => e.event === 'PokemonMinted');
        const newTokenId = event.args.tokenId;
        
        // Approve and list
        await pokemonNFT.connect(seller).approve(marketplace.address, newTokenId);
        await marketplace.connect(seller).createMarketItem(
          pokemonNFT.address,
          newTokenId,
          price.add(ethers.utils.parseEther(String(i * 0.1)))
        );
      }
      
      // Buy one item
      await marketplace.connect(buyer).createMarketSale(
        pokemonNFT.address,
        2,  // Second item
        { value: price.add(ethers.utils.parseEther("0.1")) }
      );
    });

    it("Should fetch all unsold market items", async function () {
      const marketItems = await marketplace.fetchMarketItems();
      expect(marketItems.length).to.equal(3);  // All items except the one we bought
      
      // All items should be unsold
      for (const item of marketItems) {
        expect(item.sold).to.equal(false);
        expect(item.owner).to.equal(ethers.constants.AddressZero);
      }
    });

    it("Should fetch items owned by buyer", async function () {
      const buyerItems = await marketplace.connect(buyer).fetchMyNFTs();
      expect(buyerItems.length).to.equal(1);
      expect(buyerItems[0].tokenId).to.equal(2);
      expect(buyerItems[0].sold).to.equal(true);
      expect(buyerItems[0].owner).to.equal(buyer.address);
    });

    it("Should fetch items listed by seller", async function () {
      const sellerItems = await marketplace.connect(seller).fetchItemsListed();
      expect(sellerItems.length).to.equal(4);  // All original items
      
      // All items should have the seller as the seller
      for (const item of sellerItems) {
        expect(item.seller).to.equal(seller.address);
      }
    });
  });
});