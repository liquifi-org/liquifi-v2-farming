// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IAutoStaking {
    struct UserInfo {
        uint256 shares; // number of shares for a user
        uint256 lastDepositedTime; // keeps track of deposited time for potential penalty
        uint256 tokensAtLastUserAction; // keeps track of tokens deposited at the last user action
        uint256 lastUserActionTime; // keeps track of the last user action time
    }

    struct Status {
        address token;
        uint256 rewardPerBlock;
        uint256 tokensWithCompounding;
        uint256 tokensAtLastUserAction;
        uint256 performanceFee;
        uint256 callFee;
        uint256 withdrawFee;
        uint256 withdrawFeePeriod;
        uint256 rewardPerClaim;
        uint256 userTimeFeeEnd;
        uint256 accDeposited;
    }

    function getRewardPerClaim(uint256 _bn) external view returns (uint256);

    function getStatus(address _user, uint256 _bn) external view returns (Status memory);

    function getUserInfo(address _user) external view returns (UserInfo memory);

    function deposit(uint256 _amount) external;

    function withdrawAll() external;

    function claim() external;

    function inCaseTokensGetStuck(address _token, uint256 _amount) external;

    function getPricePerFullShare(uint256 _bn) external view returns (uint256);

    function withdraw(uint256 _shares) external;

    function setWithdrawFeePeriod(uint256 _newValue) external;

    function setPerformanceFee(uint256 _newValue) external;

    function setCallFee(uint256 _newValue) external;

    function setWithdrawFee(uint256 _newValue) external;

    function setDivisor(uint256 _newValue) external;

    function setTreasury(address _newAddress) external;
}
