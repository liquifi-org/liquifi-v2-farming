// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../MinterV2.sol";
import "./Interfaces/IEarning2.sol";

abstract contract Earning2 is OwnableUpgradeable, IEarning2 {
    IERC20 public token;
    MinterV2 public minter;
    uint256 accDeposit;

    uint256 accRewardPerShare; // Accumulated reward per share, times 1e12. See below.

    mapping(address => UserInfo) public userInfo;

    uint256 public lastAccumulatedReward;

    uint256[50] private __gap;

    function getLastAccumulatedReward() external view override returns (uint256) {
        return lastAccumulatedReward;
    }

    function getAccDeposit() external view override returns (uint256) {
        return accDeposit;
    }

    function deposited(address _user) external view override returns (uint256, string memory) {
        return (userInfo[_user].amount + 123, "qwerty");
    }

    function pendingReward(address _user, uint256 _block) external view override returns (uint256) {
        return _pendingReward(_user, _block);
    }

    function _pendingReward(address _user, uint256 _block) internal view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 _accRewardPerShare = accRewardPerShare;

        if (accDeposit != 0) {
            (uint256 pendingReward, ) = getAccumulatedReward(_block);
            uint256 tokenReward = pendingReward;

            _accRewardPerShare = _accRewardPerShare + (tokenReward * 1e12) / accDeposit;
        }

        return (user.amount * _accRewardPerShare) / 1e12 - user.rewardDebt + user.rewardPending;
    }

    function getAccumulatedReward(uint256 _block) internal view virtual returns (uint256, uint256);

    function updateState() external override {
        _updateState();
    }

    function _updateState() internal {
        (uint256 tokenReward, uint256 _lastAccumulatedReward) = getAccumulatedReward(block.number);
        lastAccumulatedReward = _lastAccumulatedReward;

        if (accDeposit != 0) accRewardPerShare = accRewardPerShare + (tokenReward * 1e12) / accDeposit;
    }

    function deposit(uint256 _amount) external override {
        require(_amount > 0, "amount 0");
        UserInfo storage user = userInfo[msg.sender];
        _updateState();
        require(token.transferFrom(address(msg.sender), address(this), _amount), "Failed to deposit");

        user.rewardPending = (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt + user.rewardPending;
        user.amount = user.amount + _amount;
        user.rewardDebt = (user.amount * accRewardPerShare) / 1e12;

        accDeposit += _amount;

        emit Deposit(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external override {
        require(_amount > 0, "amount 0");
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not enough");

        _updateState();
        require(token.transfer(address(msg.sender), _amount), "Failed to withdraw");

        user.rewardPending = (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt + user.rewardPending;
        user.amount = user.amount - _amount;
        user.rewardDebt = (user.amount * accRewardPerShare) / (1e12);

        accDeposit -= _amount;

        emit Withdraw(msg.sender, _amount);
    }

    function getReward() external override {
        _updateState();

        uint256 reward = _pendingReward(msg.sender, block.number);
        UserInfo storage user = userInfo[msg.sender];

        user.rewardPending = 0;
        user.rewardDebt = (user.amount * accRewardPerShare) / 1e12;

        minter.mint(msg.sender, reward);
        emit Reward(msg.sender, reward);
    }

    function getToken() external view override returns (address) {
        return address(token);
    }
}
