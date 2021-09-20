// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IEarning {
    struct UserInfo {
        uint256 amount; // How many tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        uint256 rewardPending;
        //   pending reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt + user.rewardPending
        //   Whenever a user deposits or withdraws tokens, here's what happens:
        //   1. The pool's `accRewardPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
        //        uint256 amountClaimed;
    }

    struct EarningCheckpoint {
        uint256 block;
        uint256 rewardPerBlock;
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Reward(address indexed user, uint256 amount);

    function updateState() external;

    function getLastAccumulatedReward() external view returns (uint256);

    function getAccDeposit() external view returns (uint256);

    function deposited(address _user) external view returns (uint256);

    function pendingReward(address _user, uint256 _block) external view returns (uint256);

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function getReward() external;

    function getToken() external view returns (address);
}
