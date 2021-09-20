import { ethers, upgrades } from "hardhat"
import hre from "hardhat"
import { BigNumber } from "ethers"
import { string } from "hardhat/internal/core/params/argumentTypes"

let lqfv1 = "0x0bCe99516570985a69A5899daB340a84D3004dFA"
let lqfv2 = "0x23308e324Cb92a964183211EdF470c918caE58ca"
let minterAddr: any
let myAddr: any

let lpTokens = [
  { addr: "0xb36335ae0897ab7ae333ca7df2ff66d91225fafe", multiplier: 2 },
  { addr: "0x79A64b136704e38EFFC3Ce3E432dB3289DE36615", multiplier: 3 },
  { addr: "0x2af3123f32946b206decd6efbe3432f117ecfb44", multiplier: 5 },
]

let stakingTokens = [{ addr: lqfv2, multiplier: 40 }]

const tokens = (value: number, decimals = 18) => BigNumber.from(value).mul(BigNumber.from(10).pow(decimals))

// address _token
// uint256 _rewardPerBlock
async function deployMinter() {
  const Contract = await ethers.getContractFactory("MinterV2")
  const contract = await hre.upgrades.deployProxy(Contract, [lqfv2, tokens(20)], { initializer: "initialize" })
  await contract.deployed()

  console.log("minter", contract.address)
  minterAddr = contract.address
  return contract
}

async function deployAutostaking() {
  const Contract = await ethers.getContractFactory("AutoStakingV2")
  const contract = await hre.upgrades.deployProxy(
    Contract, //staking                                         //minter
    [lqfv2, "0x6586e2606bb23d17d5a43087a393a8eb334026ac", "0xCafED7D9c796cb1B4050962e415627fe4a16a5B9"],
    {
      initializer: "initialize",
    }
  )
  await contract.deployed()

  console.log("autostaking", contract.address)
  minterAddr = contract.address
  return contract
}

async function deploySF() {
  const Contract = await ethers.getContractFactory("StakingFactory")
  const contract = await hre.upgrades.deployProxy(Contract, [minterAddr], { initializer: "initialize" })
  await contract.deployed()

  console.log("sf", contract.address)
  return contract
}

async function deployFF() {
  const Contract = await ethers.getContractFactory("FarmingFactory")
  const contract = await hre.upgrades.deployProxy(Contract, [minterAddr], { initializer: "initialize" })
  await contract.deployed()

  console.log("ff", contract.address)
  return contract
}

async function main() {
  myAddr = (await hre.ethers.getSigners())[0].address
  // myAddr = "0x62F1A9259f0992f1190d4F877bF1B2C1e2EC3794"

  console.log("--> DEPLOYING Minter")
  let minter = await deployMinter()
  console.log("--> SETTING Minter")
  await minter.setDev(myAddr)
  await minter.setDevPercentage(100)

  console.log("--> DEPLOYING StakingFactory")
  let sf = await deploySF()
  console.log("--> DEPLOYING FarmingFactory")
  let ff = await deployFF()

  console.log("--> REGISTERING Factories")
  await minter.registerFactory(ff.address)
  await minter.registerFactory(sf.address)

  console.log("--> DEPLOYING Farmings")
  for (let i of lpTokens) {
    console.log("Deploying ", i.addr)
    await ff.createFarming(i.addr, minterAddr, i.multiplier, { gasLimit: 2500000 })
  }

  console.log("--> DEPLOYING Stakings")
  let stakingAddress = ""
  for (let i of stakingTokens) {
    console.log("Deploying ", i.addr)
    let tx = await sf.createStaking(i.addr, minter.address, i.multiplier, { gasLimit: 2500000 })
    tx = await tx.wait()
    stakingAddress = tx.events[2].args.addr
  }

  console.log("--> SETTING xyz")
  await minter.setXYZ(50, tokens(10), { gasLimit: 150000 })

  console.log("--> SETTING lqf token's new minter")
  // let LQFV2 = await ethers.getContractFactory("LiquifiV2Token")
  // let lqfv2Contract = await LQFV2.attach(lqfv2)
  // await lqfv2Contract.setMinter(minterAddr)

  // Upgrading
  // const Contract3 = await ethers.getContractFactory("StakingV2")
  // const instance = await Contract3.attach(stakingAddress)
  // console.log(await instance.deposited(myAddr))
  //
  // console.log("Upgraded factory to v2")
  // const Contract2 = await ethers.getContractFactory("StakingFactoryV2")
  // let newSF = await hre.upgrades.upgradeProxy(sf.address, Contract2)
  //
  // console.log("Upgrading staking")
  // await newSF.upgrade(stakingAddress)
  //
  // console.log("Connecting to new staking")
  // const Contract = await ethers.getContractFactory("StakingV22")
  // const upgraded = await Contract.attach(stakingAddress)
  // console.log("Reading values")
  // console.log(await upgraded.deposited(myAddr))

  // console.log("--> TRANSFERRING OWNERSHIP")
  // await minter.transferOwnership(myAddr)
  // await sf.transferOwnership(myAddr)
  // await ff.transferOwnership(myAddr)
}

async function setXYZ() {
  const Contract = await ethers.getContractFactory("MinterV2")
  let minter = await Contract.attach("0xB844643AceA718dA329Be376a3BF48d3916Fa006")
  await minter.setXYZ(99, "14950000000000000000", { gasLimit: 150000 })
}

async function main2() {
  let auto = await deployAutostaking()
}

async function main3() {
  // myAddr = (await hre.ethers.getSigners())[0].address
  // let addr = "0x3eE79D1a37B6f911ecDB79149C29543b70B1D820"

  const Contract = await ethers.getContractFactory("AutoStakingV2")
  await hre.upgrades.upgradeProxy("0x19a3c558Aa73cfD30D3606bA6943aBbEF2e47367", Contract)
}

// main()
// main2()
main3()
  // setXYZ()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
