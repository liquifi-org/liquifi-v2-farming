// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IStakingFactory {
    event StakingCreatedEvent(address addr);

    function createStaking(
        address _token,
        address _minter,
        uint256 _multiplier
    ) external returns (address);
}
