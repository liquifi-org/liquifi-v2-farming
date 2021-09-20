// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IFarmingFactory {
    event FarmingCreatedEvent(address addr);

    function createFarming(
        address _token,
        address _minter,
        uint256 _multiplier
    ) external returns (address);
}
