// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PokemonMarketplace is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;
    
    // Listing fee percentage (e.g., 2.5% = 250 / 10000)
    uint256 public listingFeePercentage = 250;
    uint256 public constant PERCENTAGE_DENOMINATOR = 10000;
    
    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        uint256 listedAt;
    }

    // itemId => MarketItem
    mapping(uint256 => MarketItem) private idToMarketItem;
    
    // Events
    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold,
        uint256 listedAt
    );
    
    event MarketItemSold(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price
    );

    /**
     * @dev Creates a market item listing for an NFT
     * @param nftContract Address of the NFT contract
     * @param tokenId ID of the NFT to create a market listing for
     * @param price Price at which the NFT is listed (in wei)
     */
    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public nonReentrant {
        require(price > 0, "Price must be greater than 0");
        
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        
        // Create the market item
        idToMarketItem[itemId] = MarketItem(
            itemId,
            nftContract,
            tokenId,
            payable(msg.sender),
            payable(address(0)),  // No owner yet (owner = 0x0 address)
            price,
            false,
            block.timestamp
        );
        
        // Transfer the NFT from the seller to the marketplace contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        emit MarketItemCreated(
            itemId,
            nftContract,
            tokenId,
            msg.sender,
            address(0),
            price,
            false,
            block.timestamp
        );
    }

    /**
     * @dev Executes a sale of a market item
     * @param nftContract Address of the NFT contract
     * @param itemId ID of the market item
     */
    function createMarketSale(
        address nftContract,
        uint256 itemId
    ) public payable nonReentrant {
        uint256 price = idToMarketItem[itemId].price;
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        address payable seller = idToMarketItem[itemId].seller;
        
        require(msg.value == price, "Please submit the asking price");
        require(idToMarketItem[itemId].sold == false, "Item already sold");
        
        // Calculate fee amount
        uint256 listingFee = (price * listingFeePercentage) / PERCENTAGE_DENOMINATOR;
        uint256 sellerProceeds = price - listingFee;
        
        // Transfer the NFT to the buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        // Mark as sold and update owner
        idToMarketItem[itemId].owner = payable(msg.sender);
        idToMarketItem[itemId].sold = true;
        _itemsSold.increment();
        
        // Transfer payment to seller
        (bool success, ) = seller.call{value: sellerProceeds}("");
        require(success, "Transfer to seller failed");
        
        emit MarketItemSold(
            itemId,
            nftContract,
            tokenId,
            seller,
            msg.sender,
            price
        );
    }
    
    /**
     * @dev Cancel a market listing and return the NFT to the seller
     * @param itemId ID of the market item to cancel
     */
    function cancelMarketItem(uint256 itemId) public nonReentrant {
        require(idToMarketItem[itemId].seller == msg.sender, "Only seller can cancel listing");
        require(!idToMarketItem[itemId].sold, "Cannot cancel sold items");
        
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        address nftContract = idToMarketItem[itemId].nftContract;
        
        // Transfer the NFT back to the seller
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        // Remove the listing
        delete idToMarketItem[itemId];
    }

    /**
     * @dev Updates the listing fee percentage
     * @param _listingFeePercentage New listing fee percentage (e.g., 2.5% = 250)
     */
    function updateListingFeePercentage(uint256 _listingFeePercentage) public onlyOwner {
        require(_listingFeePercentage <= 1000, "Fee cannot exceed 10%");
        listingFeePercentage = _listingFeePercentage;
    }

    /**
     * @dev Withdraw accumulated fees to the contract owner
     */
    function withdrawFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Fetches all unsold market items
     */
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = _itemIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;
        
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].owner == address(0)) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /**
     * @dev Fetches market items owned by the caller
     */
    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 myItemCount = 0;
        uint256 currentIndex = 0;
        
        // Get count of items owned by user
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                myItemCount += 1;
            }
        }
        
        // Create array of those items
        MarketItem[] memory items = new MarketItem[](myItemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].owner == msg.sender) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    
    /**
     * @dev Fetches market items created/listed by the caller
     */
    function fetchItemsListed() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 listedItemCount = 0;
        uint256 currentIndex = 0;
        
        // Get count of items listed by user
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].seller == msg.sender) {
                listedItemCount += 1;
            }
        }
        
        // Create array of those items
        MarketItem[] memory items = new MarketItem[](listedItemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (idToMarketItem[i].seller == msg.sender) {
                MarketItem storage currentItem = idToMarketItem[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}