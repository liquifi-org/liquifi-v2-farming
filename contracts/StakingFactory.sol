// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./StakingV2.sol";

import "./Dependencies/InitializableAdminUpgradeabilityProxy.sol";
import "./Interfaces/IStakingFactory.sol";
import "./Interfaces/IMinter.sol";

contract StakingFactory is IStakingFactory, OwnableUpgradeable {
    address public minter;

    function initialize(address _minter) external initializer {
        __Ownable_init();

        minter = _minter;
    }

    function createStaking(
        address _token,
        address _minter,
        uint256 _multiplier
    ) external override onlyOwner returns (address) {
        address addr = _createStaking(_token, _minter);
        emit StakingCreatedEvent(addr);
        IMinter(minter).registerStaking(addr, _multiplier);
        return addr;
    }

    function _createStaking(address _token, address _minter) internal returns (address) {
        bytes memory data = abi.encodeWithSelector(StakingV2.initialize.selector, _token, _minter, owner());
        InitializableAdminUpgradeabilityProxy proxy = new InitializableAdminUpgradeabilityProxy();
        proxy.initialize(getOrCreateImplementation(), address(this), data);
        return address(proxy);
    }

    function getOrCreateImplementation() internal returns (address implementation) {
        bytes32 salt = bytes32("StakingV2");
        bytes memory bytecode = type(StakingV2).creationCode;
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode)));
        implementation = address(uint160(uint256(hash)));

        if (isContract(implementation)) {
            return implementation;
        }
        assembly {
            implementation := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(implementation != address(0), "Unable to create contract");
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
