import { ethers, upgrades } from "hardhat"
import hre from "hardhat"
import { BigNumber } from "ethers"
import { string } from "hardhat/internal/core/params/argumentTypes"

let lqfv2 = "0xdABd06C46b812B40D77Cd62c3417Cb40851783bb"
let minterAddr: any
let myAddr: any

let lpTokens = [
  { addr: "0x131760ad819ccd937f7fe7ad77b7c3e17f9c7eb8", multiplier: 4 },
  { addr: "0x94688e6893700e0d19fbfe53840eff439fc81928", multiplier: 4 },
  { addr: "0x26391f50e541fa847c977eae4e33e93206e07dd3", multiplier: 1 },
  { addr: "0x2d556ae81cf622f235796681981a339b8de361b5", multiplier: 4 },
]

let stakingTokens = [{ addr: lqfv2, multiplier: 1 }]

let latestMinter = "0x62c42E62054000bDA2C95Fa97eBC591AFF30cb35"
let latestStaking = "0xc3d640b7dbb3eb903e65481ae38c860fc5f5b0c7"
async function deployAutostaking() {
  const Contract = await ethers.getContractFactory("AutoStakingV2")
  const contract = await hre.upgrades.deployProxy(Contract, [lqfv2, latestStaking, latestMinter, 200, 5, 10, 259200, 10000], {
    initializer: "initialize",
  })
  await contract.deployed()
  console.log("autostaking", contract.address)
}

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
  myAddr = "0xd39Be3664A5a836efc5C69dB2cD4F1af43B31d96"

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
  await minter.setXYZ(99, "14950000000000000000", { gasLimit: 150000 })

  console.log("--> SETTING lqf token's new minter")
  let LQFV2 = await ethers.getContractFactory("LiquifiV2Token")
  let lqfv2Contract = await LQFV2.attach(lqfv2)
  await lqfv2Contract.setMinter(minterAddr)

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

  console.log("--> TRANSFERRING OWNERSHIP")
  await minter.transferOwnership(myAddr)
  await sf.transferOwnership(myAddr)
  await ff.transferOwnership(myAddr)
}

async function main2() {
  await deployAutostaking()
}

// main()
main2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
