import { ethers, upgrades } from "hardhat"

import { expect } from "chai"
import { Contract, Signer } from "ethers"
import { bytes32, timeout, wait, now, timeoutAppended, advanceBlockTo, getCurrentBlock } from "./utils/utils"
import { LiquifiV2Token, MinterV2, FarmingV2, StakingFactory, FarmingFactory, StakingV2, StakingV2__factory } from "../typechain"

import { tokens } from "./utils/utils"
import { AddressZero } from "@ethersproject/constants"

describe("Liquifi Earning V2", async () => {
  let dev: Signer
  let fraud: Signer
  let user1: Signer, user2: Signer, user3: Signer
  let user1Addr: string, user2Addr: string, user3Addr: string
  let token: LiquifiV2Token
  let dummyToken: LiquifiV2Token
  let minter: MinterV2
  let sFactory: StakingFactory
  let fFactory: FarmingFactory
  let staking: StakingV2
  let farming: FarmingV2
  let farming2: FarmingV2

  before(async () => {
    ;[dev, fraud, user1, user2, user3] = await ethers.getSigners()

    token = (await (await ethers.getContractFactory("LiquifiV2Token"))
      .connect(dev)
      .deploy("Liquifi V2 Token", "L2T", await dev.getAddress())) as LiquifiV2Token

    dummyToken = (await (await ethers.getContractFactory("LiquifiV2Token"))
      .connect(dev)
      .deploy("Liquifi V2 Token", "L2T", await dev.getAddress())) as LiquifiV2Token

    minter = (await upgrades.deployProxy(await ethers.getContractFactory("MinterV2"), [token.address, tokens(20)])) as MinterV2

    user1Addr = await user1.getAddress()
    user2Addr = await user2.getAddress()
    user3Addr = await user3.getAddress()

    await dummyToken.mint(user1Addr, tokens(100))
    await dummyToken.mint(user2Addr, tokens(100))
    await token.mint(user3Addr, tokens(100))

    await token.connect(dev).setMinter(minter.address)

    sFactory = (await upgrades.deployProxy(await ethers.getContractFactory("StakingFactory"), [minter.address])) as StakingFactory

    fFactory = (await upgrades.deployProxy(await ethers.getContractFactory("FarmingFactory"), [minter.address])) as FarmingFactory
  })

  it("Please work", async () => {
    await expect(minter.connect(fraud).mint(user1Addr, 1000)).to.be.revertedWith("Not registered") //only factories can register
    await expect(sFactory.connect(fraud).createStaking(token.address, minter.address, 2)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    await expect(fFactory.connect(fraud).createFarming(token.address, minter.address, 2)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    )
    await expect(sFactory.createStaking(token.address, minter.address, 1)).to.be.revertedWith("Only factories can register")

    await expect(minter.connect(fraud).registerFactory(sFactory.address)).to.be.revertedWith("Ownable: caller is not the owner")
    await minter.registerFactory(sFactory.address)
    await minter.registerFactory(fFactory.address)

    let _staking = await (await sFactory.createStaking(token.address, minter.address, 3)).wait().then(async (it) => {
      return it.events![2].args!.addr
    })
    staking = StakingV2__factory.connect(_staking, dev)

    let _farming = await (await fFactory.createFarming(dummyToken.address, minter.address, 2)).wait().then(async (it) => {
      return it.events![2].args!.addr
    })
    farming = StakingV2__factory.connect(_farming, dev)

    let farms = await minter.getStatusFarms(AddressZero, await ethers.provider.getBlockNumber())
    let stakings = await minter.getStatusStaking(AddressZero, await ethers.provider.getBlockNumber())

    console.log(farms)
    console.log(stakings)

    expect(farms[0].multiplier).to.be.equal(2)
    expect(stakings[0].multiplier).to.be.equal(3)
    expect(farms[0].rewardPerBlock).to.be.equal(0)
    expect(stakings[0].rewardPerBlock).to.be.equal(0)

    console.log("111")
    await expect(minter.connect(fraud).setXYZ(50, tokens(10))).to.be.revertedWith("Ownable: caller is not the owner")
    await minter.setXYZ(50, tokens(10))
    console.log("111")

    farms = await minter.getStatusFarms(AddressZero, await ethers.provider.getBlockNumber())
    console.log("111")
    stakings = await minter.getStatusStaking(AddressZero, await ethers.provider.getBlockNumber())
    console.log("111")

    expect(farms[0].rewardPerBlock).to.be.equal(tokens(5))
    expect(stakings[0].rewardPerBlock).to.be.equal(tokens(5))

    console.log("222")
    let _farming2 = await (await fFactory.createFarming(dummyToken.address, minter.address, 3)).wait().then(async (it) => {
      return it.events![2].args!.addr
    })
    console.log("222")
    farming2 = StakingV2__factory.connect(_farming2, dev)
    console.log("222")

    await minter.setXYZ(50, tokens(10))

    farms = await minter.getStatusFarms(AddressZero, await ethers.provider.getBlockNumber())
    expect(farms[0].multiplier).to.be.equal(2)
    expect(farms[1].multiplier).to.be.equal(3)
    expect(farms[0].rewardPerBlock).to.be.equal(tokens(2))
    expect(farms[1].rewardPerBlock).to.be.equal(tokens(3))

    console.log("333")

    await dummyToken.connect(user1).approve(farming.address, tokens(100))
    await dummyToken.connect(user2).approve(farming2.address, tokens(100))
    await token.connect(user3).approve(staking.address, tokens(100))

    console.log("333")

    await farming.connect(user1).deposit(tokens(2))
    await farming2.connect(user2).deposit(tokens(3))
    await staking.connect(user3).deposit(tokens(5))

    console.log("333")

    await advanceBlockTo(ethers.provider, 103)

    console.log("333")
    console.log(await minter.getStatusFarms(user1Addr, await ethers.provider.getBlockNumber()))
    console.log(await minter.getStatusFarms(user2Addr, await ethers.provider.getBlockNumber()))
    console.log(await minter.getStatusStaking(user3Addr, await ethers.provider.getBlockNumber()))
  })
})
