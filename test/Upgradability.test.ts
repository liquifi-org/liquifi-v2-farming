import hre, { ethers, upgrades } from "hardhat"
import { expect } from "chai"
import { BigNumber, BigNumberish, Signer } from "ethers"
import { AddressZero } from "@ethersproject/constants"
import { FarmingV2, MinterV2 } from "../typechain"

let lqfv1 = "0x0bCe99516570985a69A5899daB340a84D3004dFA"
let lqfv2 = "0x23308e324Cb92a964183211EdF470c918caE58ca"
let minterAddr: any
let myAddr: any
const tokens = (value: number, decimals = 18) => BigNumber.from(value).mul(BigNumber.from(10).pow(decimals))

async function deploySF() {
  const Contract = await ethers.getContractFactory("StakingFactory")
  const contract = await hre.upgrades.deployProxy(Contract, [minterAddr], { initializer: "initialize" })
  await contract.deployed()

  console.log("sf", contract.address)
  return contract
}

async function deployMinter() {
  const Contract = await ethers.getContractFactory("MinterV2")
  const contract = await hre.upgrades.deployProxy(Contract, [lqfv2, tokens(20)], { initializer: "initialize" })
  await contract.deployed()

  console.log("minter", contract.address)
  minterAddr = contract.address
  return contract
}

let stakingTokens = [{ addr: lqfv2, multiplier: 40 }]

describe("Upgradeability", async () => {
  let owner: Signer

  before(async () => {
    ;[owner] = await ethers.getSigners()
  })

  it("Staking is upgradable", async () => {
    myAddr = (await hre.ethers.getSigners())[0].address

    console.log("--> DEPLOYING Minter")
    let minter = await deployMinter()

    console.log("--> DEPLOYING StakingFactory")
    let sf = await deploySF()

    console.log("--> REGISTERING Factories")
    await minter.registerFactory(sf.address)

    console.log("--> DEPLOYING Stakings")
    let stakingAddress = ""
    for (let i of stakingTokens) {
      console.log("Deploying ", i.addr)
      let tx = await sf.createStaking(i.addr, minter.address, i.multiplier, { gasLimit: 2500000 })
      tx = await tx.wait()
      stakingAddress = tx.events[2].args.addr
    }

    const Contract3 = await ethers.getContractFactory("StakingV2")
    const instance = await Contract3.attach(stakingAddress)
    console.log(await instance.deposited(myAddr))

    console.log("Upgraded factory to v2")
    const Contract2 = await ethers.getContractFactory("StakingFactoryV2")
    let newSF = await hre.upgrades.upgradeProxy(sf.address, Contract2)

    await newSF.upgrade(stakingAddress)

    const Contract = await ethers.getContractFactory("StakingV22")
    const upgraded = await Contract.attach(stakingAddress)
    console.log(await upgraded.deposited(myAddr))
  })
})
