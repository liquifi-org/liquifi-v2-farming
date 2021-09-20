import { ethers, upgrades } from "hardhat"

import { expect } from "chai"
import { BigNumber, Contract, ContractFactory, Signer } from "ethers"
import { bytes32, timeout, wait, now, timeoutAppended, advanceBlockTo, getCurrentBlock } from "./utils/utils"
import { LiquifiV2Token, MinterV2, StakingV2, AutoStakingV2 } from "../typechain"

import { tokens } from "./utils/utils"
import { AddressZero } from "@ethersproject/constants"

describe("Liquifi Earning V2", async () => {
  let dev: Signer
  let alice: Signer
  let bob: Signer

  let token: LiquifiV2Token
  let earning: StakingV2
  let minter: MinterV2
  let autoStaking: AutoStakingV2

  beforeEach(async () => {
    ;[dev, alice, bob] = await ethers.getSigners()

    token = (await (await ethers.getContractFactory("LiquifiV2Token"))
      .connect(dev)
      .deploy("Liquifi V2 Token", "L2T", await dev.getAddress())) as LiquifiV2Token

    const Minter = await ethers.getContractFactory("MinterV2")
    minter = (await upgrades.deployProxy(Minter, [token.address, tokens(20)])) as MinterV2

    const StakingV2 = await ethers.getContractFactory("StakingV2")
    earning = (await upgrades.deployProxy(StakingV2, [token.address, minter.address, await dev.getAddress()])) as StakingV2

    await minter.registerFactory(await dev.getAddress())
    await minter.connect(dev).registerStaking(earning.address, 1)
    await minter.setXYZ(50, tokens(10))

    const AutoStakingV2 = await ethers.getContractFactory("AutoStakingV2")
    autoStaking = (await upgrades.deployProxy(AutoStakingV2, [
      token.address,
      earning.address,
      minter.address,
      250,
      20,
      10,
      259200,
      10000,
    ])) as AutoStakingV2

    await token.mint(await alice.getAddress(), tokens(123456789123))
    await token.mint(await bob.getAddress(), tokens(123456789123))
    await token.connect(alice).approve(autoStaking.address, tokens(123456789123))
    await token.connect(bob).approve(autoStaking.address, tokens(123456789123))

    await token.setMinter(minter.address)
  })

  it.only("Balance test", async () => {
    await print()

    await autoStaking.connect(alice).deposit(tokens(1))
    await autoStaking.connect(bob).deposit(tokens(10))

    await advanceBlocks(1)
    await print()

    await advanceBlocks(1)
    await print()

    await advanceBlocks(1)
    await print()
  })

  it("Test0000", async () => {
    await autoStaking.connect(alice).deposit(tokens(123456789123))
    await autoStaking.connect(bob).deposit(tokens(123456789123))
    await print()

    await advanceBlocks(1)
    await print()

    await advanceBlocks(1)
    await print()

    console.log("-------")
    console.log(await autoStaking.getStatus(await alice.getAddress(), await ethers.provider.getBlockNumber()))

    console.log("-------")
    await autoStaking.connect(alice).withdrawAll()
    // await autoStaking.connect(alice).withdraw("24662500000000000000")
    await autoStaking.connect(bob).withdrawAll()
    await print()
  })

  it("Test0", async () => {
    let rpb = (await minter.farm(earning.address))["multiplier"].mul(await minter.X()).div(await minter.accMultiplierForStakings())
    console.log("rpb", rpb)

    console.log(await autoStaking.getStatus(await alice.getAddress(), await bn()))
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await autoStaking.connect(alice).deposit(tokens(10))
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    await advanceBlocks(1)
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())

    // await advanceBlocks(5)
    // console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    // console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())
    //
    // await advanceBlocks(5)
    // console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    // console.log((await earning.pendingReward(autoStaking.address, await bn())).div(1e15).toString())

    console.log("----------")
    console.log("shares", await autoStaking.userInfo(await alice.getAddress()))

    await autoStaking.connect(alice).withdrawAll()

    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding.div(1e15).toString())
    console.log((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensAtLastUserAction.div(1e15).toString())

    console.log("shares", await autoStaking.userInfo(await alice.getAddress()))
  })

  it("Test1", async () => {
    console.log(await autoStaking.getStatus(AddressZero, BigNumber.from("123")))
    await autoStaking.connect(alice).deposit(tokens(10))
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal("0")
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal(0)
    expect(await earning.getAccDeposit()).to.be.equal(tokens(10))
    expect(await earning.deposited(autoStaking.address)).to.be.equal(tokens(10))

    await advanceBlockTo(ethers.provider, (await bn()) + 1)

    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal(tokens(5))

    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal(tokens(5))

    await autoStaking.connect(alice).claim()

    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal(0)
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal(0)
    // expect(await token.balanceOf(await alice.getAddress())).to.be.equal(tokens(0))
  })

  it("Test2", async () => {
    await autoStaking.connect(alice).deposit(tokens(2))
    await advanceBlocks(1)
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal(tokens(5))

    await advanceBlocks(3)
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal(tokens(20))
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal(tokens(20))

    await autoStaking.connect(alice).claim()
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal(0)
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn())).to.be.equal(0)

    await advanceBlocks(1)
    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal("4999999999977450000")

    await autoStaking.connect(bob).deposit(tokens(2))

    expect(await autoStaking.calculateTotalPendingTokenRewards(await bn()))
      .to.be.equal(await earning.pendingReward(autoStaking.address, await bn()))
      .to.be.equal("9999999999981225000")

    // console.log("pending", (await autoStaking.potentialReward(await alice.getAddress())).toString())
    // console.log("pending", (await autoStaking.potentialReward(await bob.getAddress())).toString())

    await autoStaking.connect(alice).withdrawAll()
    await autoStaking.connect(bob).withdrawAll()

    console.log((await token.balanceOf(await alice.getAddress())).toString())
    console.log((await token.balanceOf(await bob.getAddress())).toString())
  })

  it("TestStaking", async () => {
    await token.connect(alice).approve(earning.address, tokens(10))

    await earning.connect(alice).deposit(tokens(10))
    expect(await earning.deposited(await alice.getAddress())).to.be.equal(tokens(10))
    expect(await earning.pendingReward(await alice.getAddress(), (await bn()).toString())).to.be.equal(tokens(0))
    await advanceBlocks(1)
    expect(await earning.pendingReward(await alice.getAddress(), (await bn()).toString())).to.be.equal(tokens(5))
    await advanceBlocks(1)
    expect(await earning.pendingReward(await alice.getAddress(), (await bn()).toString())).to.be.equal(tokens(10))
  })

  async function advanceBlocks(blocks: number) {
    await advanceBlockTo(ethers.provider, (await bn()) + blocks)
  }

  async function bn() {
    return await ethers.provider.getBlockNumber()
  }

  async function print() {
    console.log("block.number: ", await ethers.provider.getBlockNumber())

    console.log("earned", (await earning.pendingReward(autoStaking.address, await bn())).toString())
    console.log(
      "alice",
      (await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensWithCompounding
        .sub((await autoStaking.getStatus(await alice.getAddress(), await bn())).tokensAtLastUserAction)
        .toString()
    )
    console.log(
      "bob",
      (await autoStaking.getStatus(await bob.getAddress(), await bn())).tokensWithCompounding
        .sub((await autoStaking.getStatus(await bob.getAddress(), await bn())).tokensAtLastUserAction)
        .toString()
    )
  }
})
