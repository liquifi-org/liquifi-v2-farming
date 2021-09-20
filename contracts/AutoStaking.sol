// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Interfaces/IStaking.sol";
import "./Interfaces/IAutoStaking.sol";
import "./MinterV2.sol";

contract AutoStakingV2 is IAutoStaking, OwnableUpgradeable {
    IERC20 public token;
    IStaking public staking;
    MinterV2 public minter;
    address treasury;

    mapping(address => UserInfo) public userInfo;

    uint256 public totalShares;
    uint256 public lastHarvestedTime;

    event Deposit(address indexed sender, uint256 amount, uint256 shares, uint256 lastDepositedTime);
    event Withdraw(address indexed sender, uint256 amount, uint256 shares);
    event Harvest(address indexed sender, uint256 performanceFee, uint256 callFee);
    event PeriodChange(uint256 _newValue);

    uint256 public performanceFee;
    uint256 public callFee;
    uint256 public withdrawFee;
    uint256 public withdrawFeePeriod;
    uint256 public divisor;

    function getUserInfo(address _user) external view override returns (UserInfo memory) {
        return userInfo[_user];
    }

    function getRewardPerClaim(uint256 _bn) external view override returns (uint256) {
        return _getRewardPerClaim(_bn);
    }

    function _getRewardPerClaim(uint256 _bn) internal view returns (uint256) {
        uint256 amount = staking.pendingReward(address(this), _bn);
        amount = amount + availableOnContract();
        uint256 currentCallFee = (amount * callFee) / divisor;

        return currentCallFee;
    }

    function getStatus(address _user, uint256 _bn) external view override returns (Status memory) {
        uint256 rpb;
        (uint256 mult, ) = minter.farm(address(staking));
        uint256 accMult = minter.accMultiplierForStakings();
        if (accMult != 0) rpb = (mult * minter.X()) / accMult;

        uint256 stakingDeposit = staking.getAccDeposit();
        if (stakingDeposit != 0) rpb = (rpb * staking.deposited(address(this))) / stakingDeposit;

        Status memory status = Status(
            address(token),
            rpb,
            (userInfo[_user].shares * _getPricePerFullShare(_bn)) / 1e18,
            userInfo[_user].tokensAtLastUserAction,
            performanceFee,
            callFee,
            withdrawFee,
            withdrawFeePeriod,
            _getRewardPerClaim(_bn),
            userInfo[_user].lastDepositedTime + withdrawFeePeriod,
            availableWithStaking()
        );

        return status;
    }

    function initialize(
        IERC20 _token,
        IStaking _staking,
        MinterV2 _minter,
        uint256 _performanceFee,
        uint256 _callFee,
        uint256 _withdrawFee,
        uint256 _withdrawFeePeriod,
        uint256 _divisor
    ) external initializer {
        token = _token;
        staking = _staking;
        minter = _minter;

        require(_token.approve(address(_staking), type(uint256).max), "Failed to approve");

        __Ownable_init();

        performanceFee = _performanceFee;
        callFee = _callFee;
        withdrawFee = _withdrawFee;
        withdrawFeePeriod = _withdrawFeePeriod;
        divisor = _divisor;

        treasury = owner();
    }

    function deposit(uint256 _amount) external override {
        require(_amount > 0, "Nothing to deposit");
        uint256 bn = block.number;
        uint256 bt = block.timestamp;

        uint256 currentShares;
        if (totalShares != 0) {
            currentShares = (_amount * totalShares) / availableWithCompound(bn);
        } else {
            currentShares = _amount;
        }

        require(token.transferFrom(msg.sender, address(this), _amount), "Failed to transfer");

        UserInfo storage user = userInfo[msg.sender];

        user.shares = user.shares + currentShares;
        user.lastDepositedTime = bt;
        user.lastUserActionTime = bt;

        totalShares = totalShares + currentShares;

        user.tokensAtLastUserAction = (user.shares * availableWithCompound(bn)) / totalShares;

        _earn();

        emit Deposit(msg.sender, _amount, currentShares, bt);
    }

    function claim() external override {
        return _claim();
    }

    function _claim() internal {
        staking.getReward();

        uint256 availableOnContract = availableOnContract();
        uint256 currentPerformanceFee = (availableOnContract * performanceFee) / divisor;
        require(token.transfer(treasury, currentPerformanceFee), "Failed to transfer to treasury");

        uint256 currentCallFee = (availableOnContract * callFee) / divisor;
        require(token.transfer(msg.sender, currentCallFee), "Failed to transfer to sender");

        _earn();

        lastHarvestedTime = block.timestamp;

        emit Harvest(msg.sender, currentPerformanceFee, currentCallFee);
    }

    function inCaseTokensGetStuck(address _token, uint256 _amount) external override onlyOwner {
        require(_token != address(token), "Token cannot be same as deposit token");

        require(IERC20(_token).transfer(msg.sender, _amount), "Failed to transfer");
    }

    function getPricePerFullShare(uint256 _bn) external view override returns (uint256) {
        return _getPricePerFullShare(_bn);
    }

    function _getPricePerFullShare(uint256 _bn) public view returns (uint256) {
        return totalShares == 0 ? 1e18 : (availableWithCompound(_bn) * 1e18) / totalShares;
    }

    function withdrawAll() external override {
        _claim();
        _withdraw((userInfo[msg.sender].shares * _getPricePerFullShare(block.number)) / 1e18);
        userInfo[msg.sender].shares = 0;
        userInfo[msg.sender].tokensAtLastUserAction = 0;
    }

    function withdraw(uint256 _amount) external override {
        _claim();
        return _withdraw(_amount);
    }

    function _withdraw(uint256 _amount) internal {
        UserInfo storage user = userInfo[msg.sender];
        uint256 _bn = block.number;

        uint256 _shares = (_amount * 1e18) / _getPricePerFullShare(_bn);

        require(_shares > 0, "Nothing to withdraw");
        require(_shares <= user.shares, "Withdraw amount exceeds balance");

        user.shares = user.shares - _shares;
        totalShares = totalShares - _shares;

        uint256 bal = availableOnContract();
        if (bal < _amount) {
            uint256 balWithdraw = _amount - bal;
            staking.withdraw(balWithdraw);
            uint256 balAfter = availableOnContract();
            uint256 diff = balAfter - bal;
            if (diff < balWithdraw) {
                _amount = bal + diff;
            }
        }

        if (block.timestamp < user.lastDepositedTime + withdrawFeePeriod) {
            uint256 currentWithdrawFee = (_amount * withdrawFee) / divisor;
            require(token.transfer(treasury, currentWithdrawFee), "Failed to transfer to treasury");
            _amount = _amount - currentWithdrawFee;
        }

        require(token.transfer(msg.sender, _amount), "Failed to transfer");

        if (user.shares > 0) {
            // think about this
            user.tokensAtLastUserAction = (user.shares * availableWithStaking()) / totalShares;
        } else {
            user.tokensAtLastUserAction = 0;
        }

        user.lastUserActionTime = block.timestamp;

        emit Withdraw(msg.sender, _amount, _shares);
    }

    function calculateTotalPendingTokenRewards(uint256 bn) public view returns (uint256) {
        uint256 amount = staking.pendingReward(address(this), bn);
        amount = amount + availableOnContract();

        return amount;
    }

    function availableOnContract() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function availableWithStaking() public view returns (uint256) {
        uint256 amount = staking.deposited(address(this));
        return token.balanceOf(address(this)) + amount;
    }

    function availableWithCompound(uint256 _blockNumber) public view returns (uint256) {
        return token.balanceOf(address(this)) + staking.deposited(address(this)) + staking.pendingReward(address(this), _blockNumber);
    }

    function _earn() internal {
        uint256 bal = availableOnContract();
        if (bal > 0) {
            staking.deposit(bal);
        }
    }

    function setWithdrawFeePeriod(uint256 _newValue) external override onlyOwner {
        withdrawFeePeriod = _newValue;
        emit PeriodChange(_newValue);
    }

    function setPerformanceFee(uint256 _newValue) external override onlyOwner {
        performanceFee = _newValue;
    }

    function setCallFee(uint256 _newValue) external override onlyOwner {
        callFee = _newValue;
    }

    function setWithdrawFee(uint256 _newValue) external override onlyOwner {
        withdrawFee = _newValue;
    }

    function setDivisor(uint256 _newValue) external override onlyOwner {
        divisor = _newValue;
    }

    function setTreasury(address _newAddress) external override onlyOwner {
        treasury = _newAddress;
    }
}
