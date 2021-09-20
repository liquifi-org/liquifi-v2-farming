// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./LiquifiV2Token.sol";
import "./Interfaces/IMinter.sol";

contract MinterV2 is IMinter, Initializable, OwnableUpgradeable {
    uint256 public rewardPerBlock;
    LiquifiV2Token public token;

    mapping(address => Farm) public farm;
    mapping(address => bool) public factories;

    IEarning[] staking;
    IEarning[] farming;

    uint256 public mintedToDev;
    address public dev;
    uint256 public devPercentage;

    uint256 public accMultiplierForFarms;
    uint256 public accMultiplierForStakings;

    uint256 accFarmReward;
    uint256 accStakingReward;

    uint256 lastFarmRewardBlock;
    uint256 lastStakingRewardBlock;

    uint256 public X;
    uint256 public Y;

    function initialize(address _token, uint256 _rewardPerBlock) external initializer {
        token = LiquifiV2Token(_token);
        rewardPerBlock = _rewardPerBlock;

        __Ownable_init();
    }

    function getAccumulatedRewardFarm(
        uint256 _lastAccumulatedReward,
        uint256 _blockNumber,
        address _addr
    ) external view returns (uint256, uint256) {
        uint256 _accFarmReward = accFarmReward;
        uint256 pendingReward;
        if (accMultiplierForFarms != 0) _accFarmReward = accFarmReward + (Y * (_blockNumber - lastFarmRewardBlock)) / accMultiplierForFarms;
        pendingReward = (_accFarmReward - _lastAccumulatedReward) * farm[_addr].multiplier;
        return (pendingReward, _accFarmReward);
    }

    function getAccumulatedRewardStaking(
        uint256 _lastAccumulatedReward,
        uint256 blockNumber,
        address _addr
    ) external view returns (uint256, uint256) {
        uint256 _accStakingReward = accStakingReward;
        uint256 pendingReward;

        if (accMultiplierForStakings != 0)
            _accStakingReward = accStakingReward + (X * (blockNumber - lastStakingRewardBlock)) / accMultiplierForStakings;

        pendingReward = (_accStakingReward - _lastAccumulatedReward) * farm[_addr].multiplier;
        return (pendingReward, _accStakingReward);
    }

    function registerFactory(address _factory) external override onlyOwner {
        factories[_factory] = true;
    }

    function getStatus(
        address _farm,
        address _user,
        uint256 _block,
        uint256 _factor,
        uint256 _divisor
    ) internal view returns (FarmInfo memory) {
        FarmInfo memory f;

        f.multiplier = farm[_farm].multiplier;
        if (_divisor != 0) f.rewardPerBlock = (farm[_farm].multiplier * _factor) / _divisor;
        f.token = address(IEarning(_farm).getToken());
        f.accDeposited = IEarning(_farm).getAccDeposit();
        f.deposited = IEarning(_farm).deposited(_user);
        f.earned = IEarning(_farm).pendingReward(_user, _block);
        f.farm = _farm;

        return f;
    }

    function getStatusStaking(address _user, uint256 _block) external view override returns (FarmInfo[] memory) {
        uint256 length = staking.length;

        FarmInfo[] memory f = new FarmInfo[](length);

        for (uint256 i = 0; i < length; i++) {
            f[i] = getStatus(address(staking[i]), _user, _block, X, accMultiplierForStakings);
        }
        return f;
    }

    function getStatusFarms(address _user, uint256 _block) external view override returns (FarmInfo[] memory) {
        uint256 length = farming.length;

        FarmInfo[] memory f = new FarmInfo[](length);

        for (uint256 i = 0; i < length; i++) {
            f[i] = getStatus(address(farming[i]), _user, _block, Y, accMultiplierForFarms);
        }
        return f;
    }

    function getFarms() external view override returns (IEarning[] memory) {
        return farming;
    }

    function getStakings() external view override returns (IEarning[] memory) {
        return staking;
    }

    function registerFarm(address _farm, uint256 _multiplier) external override {
        require(factories[msg.sender] == true, "Only factories can register");
        require(farm[_farm].registered == false, "Farming already registered");

        updateFarming();

        farm[_farm].multiplier = _multiplier;
        farm[_farm].registered = true;
        farming.push(IEarning(_farm));

        accMultiplierForFarms += _multiplier;
    }

    function registerStaking(address _farm, uint256 _multiplier) external override {
        require(factories[msg.sender] == true, "Only factories can register");
        require(farm[_farm].registered == false, "Farming already registered");

        updateStaking();

        farm[_farm].multiplier = _multiplier;
        farm[_farm].registered = true;
        staking.push(IEarning(_farm));

        accMultiplierForStakings += _multiplier;
    }

    function unregisterFarm(address _farm) external override onlyOwner {
        uint256 multiplier = farm[_farm].multiplier;
        require(farm[_farm].registered == true, "not registered");

        updateFarming();

        farm[_farm].multiplier = 0;
        for (uint256 i = 0; i < farming.length; i++)
            if (address(farming[i]) == _farm) {
                farming[i] = farming[farming.length - 1];
                farming.pop();
            }

        farm[_farm].registered = false;
        accMultiplierForFarms -= multiplier;
    }

    function unregisterStaking(address _farm) external override onlyOwner {
        uint256 multiplier = farm[_farm].multiplier;
        require(farm[_farm].registered == true, "not registered");

        updateStaking();

        farm[_farm].multiplier = 0;
        for (uint256 i = 0; i < staking.length; i++)
            if (address(staking[i]) == _farm) {
                staking[i] = staking[staking.length - 1];
                staking.pop();
            }

        farm[_farm].registered = false;
        accMultiplierForStakings -= multiplier;
    }

    function changeMultiplierFarm(address _farm, uint256 _multiplier) external override onlyOwner {
        require(farm[_farm].registered == true, "not registered");

        updateFarming();
        IEarning(_farm).updateState();

        accMultiplierForFarms = accMultiplierForFarms - farm[_farm].multiplier + _multiplier;
        farm[_farm].multiplier = _multiplier;
    }

    function changeMultiplierStaking(address _farm, uint256 _multiplier) external override onlyOwner {
        require(farm[_farm].registered == true, "not registered");

        updateStaking();
        IEarning(_farm).updateState();

        accMultiplierForStakings = accMultiplierForStakings - farm[_farm].multiplier + _multiplier;
        farm[_farm].multiplier = _multiplier;
    }

    function mint(address _to, uint256 _amount) external override {
        require(farm[msg.sender].registered == true, "Not registered");

        mintedToDev += (_amount * devPercentage) / 1000;
        require(token.mint(_to, _amount), "Failed to mint tokens");
    }

    function devPull() external override {
        require(token.mint(dev, mintedToDev), "Failed to transfer to dev");
        mintedToDev = 0;
    }

    function setDev(address _dev) external override onlyOwner {
        dev = _dev;
    }

    function setDevPercentage(uint256 _devPercentage) external override onlyOwner {
        devPercentage = _devPercentage;
    }

    function setXYZ(uint256 _B, uint256 _Z) external override onlyOwner {
        require(_B <= 100, "Bad _B value");
        require(rewardPerBlock >= _Z, "_Z too big");

        updateFarming();
        updateStaking();

        uint256 _X = (_B * (rewardPerBlock - _Z)) / 100;
        uint256 _Y = ((100 - _B) * (rewardPerBlock - _Z)) / 100;

        X = _X;
        Y = _Y;
    }

    function updateStaking() internal {
        if (accMultiplierForStakings != 0)
            accStakingReward = accStakingReward + (X * (block.number - lastStakingRewardBlock)) / accMultiplierForStakings;

        lastStakingRewardBlock = block.number;
    }

    function updateFarming() internal {
        if (accMultiplierForFarms != 0) accFarmReward = accFarmReward + (Y * (block.number - lastFarmRewardBlock)) / accMultiplierForFarms;

        lastFarmRewardBlock = block.number;
    }
}
