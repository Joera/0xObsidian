// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract Pod  {
    string public cid;
    string public name;
    address[] public readers; 
    address[] public authors; 

    event PodInvite(address indexed pod, address indexed from, address indexed to);
    event PodUpdate(address indexed pod, address indexed from, string indexed cid);

    constructor(address _initiator, string memory _cid, string memory _name) {
        readers.push(_initiator);
        authors.push(_initiator);
        cid = _cid;
        name = _name;
    }

     function _exists(address[] memory _array, address _address) public pure returns (bool) {
        
        for (uint i = 0; i < _array.length; i++) {
            if (_array[i] == _address) {
                return true;
            } 
        }
        
        return false;
    }

    function inviteReader(address _from, address _reader) external {

        if (!_exists(readers, _reader)) {
            readers.push(_reader);
        }

        emit PodInvite(address(this), _from, _reader);
    }

    function getReaders() public view returns (address[] memory) {
        return readers;
    }

    function getAuthors() public view returns (address[] memory) {
        return authors;
    }

    function inviteAuthor(address _from, address _author) external {

        if (!_exists(readers, _author)) {
            readers.push(_author);
        }

        if (!_exists(authors, _author)) {
            authors.push(_author);
        }  

        emit PodInvite(address(this), _from, _author);
    }

    function update(address _from, string calldata _cid) external {

        cid = _cid;

        emit PodUpdate(address(this), _from, _cid);
    }   
} 

contract PodFactory {

    // is being used as dummy call in contract creation!
    function test() pure external returns (string memory) {

        return "hello";
    }

    function concatBytes16(address owner, string memory cid) public pure returns (bytes32 result) {
            bytes memory _cid = bytes(cid);
            bytes16 o = bytes16(bytes20(owner)); 
            bytes16 c = bytes16(_cid); 
        
        assembly {
            // Shift the first 16 bytes (a) to the left by 128 bits (16 bytes)
            // and then OR it with the second 16 bytes (b)
            result := or(shl(128, o), c)
        }
    }

    function createPod(address owner, string memory cid, string memory name) external returns (address) {

        bytes32 salt = concatBytes16(owner, cid); // replace cid with name ? 
        bytes memory bytecode = abi.encodePacked(type(Pod).creationCode, abi.encode(owner, cid, name));

        address addr = Create2.computeAddress(salt, keccak256(bytecode));
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }
        return deploy(salt, bytecode);
    }

    function deploy(bytes32 salt, bytes memory bytecode) internal returns (address addr) {
        require(bytecode.length != 0, "Create2: bytecode length is zero");
        /// @solidity memory-safe-assembly
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "Create2: Failed on deploy");
    }
}