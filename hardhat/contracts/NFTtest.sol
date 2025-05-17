// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTtest is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("TestNFT", "TNFT") {}

    function mint(address to) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
}