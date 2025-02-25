// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract Test {

    constructor(bytes memory sig) {
        address recovered = ECDSA.recover(ECDSA.toEthSignedMessageHash(keccak256("wee")), sig);
        console.log(recovered);
    }

}