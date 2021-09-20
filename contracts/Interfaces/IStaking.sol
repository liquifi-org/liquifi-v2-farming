// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IEarning.sol";

interface IStaking is IEarning {
    function compound() external;
}
