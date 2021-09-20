// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IEarning2.sol";

interface IStaking2 is IEarning2 {
    function compound() external;
}
