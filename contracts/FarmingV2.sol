// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Earning.sol";

contract FarmingV2 is Earning {
    function initialize(
        address _token,
        address _minter,
        address _owner
    ) external initializer {
        token = IERC20(_token);
        minter = MinterV2(_minter);

        __Ownable_init();
        transferOwnership(_owner);
    }

    function getAccumulatedReward(uint256 _block) internal view override(Earning) returns (uint256, uint256) {
        return minter.getAccumulatedRewardFarm(lastAccumulatedReward, _block, address(this));
    }
}
