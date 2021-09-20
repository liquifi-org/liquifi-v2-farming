// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Earning.sol";
import "./Delegate.sol";
import "./Interfaces/IStaking.sol";

contract StakingV2 is IStaking, Earning {
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

    function compound() external override {
        UserInfo storage user = userInfo[msg.sender];
        uint256 _amount = _pendingReward(msg.sender, block.number);

        _updateState();
        user.rewardPending = 0;

        minter.mint(address(this), _amount);

        user.amount = user.amount + _amount;
        user.rewardDebt = (user.amount * accRewardPerShare) / 1e12;

        accDeposit += _amount;

        emit Reward(msg.sender, _amount);
    }

    function getAccumulatedReward(uint256 _block) internal view override(Earning) returns (uint256, uint256) {
        return minter.getAccumulatedRewardStaking(lastAccumulatedReward, _block, address(this));
    }
}
