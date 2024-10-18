// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;

import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";

contract SafeFactory {
    GnosisSafeProxyFactory public proxyFactory;
    address public singleton;  // Gnosis Safe master copy address

    constructor(address _proxyFactory, address _singleton) {
        proxyFactory = GnosisSafeProxyFactory(_proxyFactory);
        singleton = _singleton;
    }

    function createSafe(address[] memory owners, uint256 threshold) public returns (address) {
        GnosisSafeProxy proxy = proxyFactory.createProxy(singleton, "");
        GnosisSafe safe = GnosisSafe(payable(address(proxy)));
        safe.setup(
            owners,         // Owners of the Safe
            threshold,      // Number of required confirmations
            address(0),     // Delegate call address
            "",             // Delegate call data
            address(0),     // Fallback handler address
            address(0),     // Payment token
            0,              // Payment amount
            payable(address(0))  // Payment receiver
        );
        return address(safe);
    }
}