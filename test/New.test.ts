import { ethers, upgrades } from "hardhat"

import { expect } from "chai"
import { BigNumber, Contract, ContractFactory, Signer } from "ethers"
import { bytes32, timeout, wait, now, timeoutAppended, advanceBlockTo, getCurrentBlock } from "./utils/utils"
import { LiquifiV2Token, MinterV2, StakingV2 } from "../typechain"

import { tokens } from "./utils/utils"

describe("Liquifi Earning V2", async () => {
  let alice: Signer
  let bob: Signer
  let carol: Signer
  let dev: Signer

  let earning: StakingV2
  let token: LiquifiV2Token
  let minter: MinterV2
  let Contract: ContractFactory

  beforeEach(async () => {
    Contract = await ethers.getContractFactory("StakingV2")
    ;[alice, bob, carol, dev] = await ethers.getSigners()

    token = (await (await ethers.getContractFactory("LiquifiV2Token"))
      .connect(dev)
      .deploy("Liquifi V2 Token", "L2T", await dev.getAddress())) as LiquifiV2Token

    const Contract2 = await ethers.getContractFactory("MinterV2")
    minter = (await upgrades.deployProxy(Contract2, [token.address, tokens(20)])) as MinterV2

    await token.mint(await alice.getAddress(), tokens(1000000000))
    await token.mint(await bob.getAddress(), tokens(100))
    await token.mint(await carol.getAddress(), tokens(100))

    await token.connect(dev).setMinter(minter.address)
  })

  it("should work", async () => {
    earning = (await upgrades.deployProxy(Contract, [token.address, minter.address, await dev.getAddress()])) as StakingV2

    await token.connect(alice).approve(earning.address, tokens(1000000000))
    await token.connect(bob).approve(earning.address, tokens(100))
    await token.connect(carol).approve(earning.address, tokens(100))

    await minter.registerFactory(await dev.getAddress())
    await minter.connect(dev).registerStaking(earning.address, 2)
    await minter.setDevPercentage(100)

    await minter.setXYZ(50, tokens(10))

    expect((await minter.getStatusStaking(await dev.getAddress(), await ethers.provider.getBlockNumber()))[0].rewardPerBlock).to.be.equal(
      tokens(5)
    )

    await earning.connect(bob).deposit(tokens(10))
    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 1)

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "5000"
    )
    expect((await earning.deposited(await bob.getAddress())).div(1e15).toString()).to.be.equal("10000")
    await earning.connect(bob).compound()
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "0"
    )
    expect((await earning.deposited(await bob.getAddress())).div(1e15).toString()).to.be.equal("20000")

    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 2)
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "10000"
    )
    expect((await earning.deposited(await bob.getAddress())).div(1e15).toString()).to.be.equal("20000")
    await earning.connect(bob).compound()
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "0"
    )
    expect((await earning.deposited(await bob.getAddress())).div(1e15).toString()).to.be.equal("35000")

    await earning.connect(alice).deposit(tokens(10))
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "4999"
    )
    expect(
      (await earning.pendingReward(await alice.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()
    ).to.be.equal("0")
    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 1)
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "8888"
    )
    expect(
      (await earning.pendingReward(await alice.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()
    ).to.be.equal("1111")
    await earning.connect(alice).deposit(tokens(25))
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "12777"
    )
    expect(
      (await earning.pendingReward(await alice.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()
    ).to.be.equal("2222")
    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 1)
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "15277"
    )
    expect(
      (await earning.pendingReward(await alice.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()
    ).to.be.equal("4722")

    let stats = await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber())
    expect(stats[0].multiplier).to.be.equal(2)
    expect(stats[0].rewardPerBlock).to.be.equal(tokens(5))
    expect(stats[0].deposited).to.be.equal(tokens(35))
    expect(stats[0].accDeposited).to.be.equal(tokens(70))
    expect(stats[0].earned).to.be.equal("15277777777745000000")

    await minter.changeMultiplierStaking(earning.address, 0)

    stats = await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber())
    expect(stats[0].multiplier).to.be.equal(0)
    expect(stats[0].rewardPerBlock).to.be.equal(tokens(0))
    expect(stats[0].earned).to.be.equal("17777777777760000000")
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )

    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 15)

    stats = await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber())
    expect(stats[0].multiplier).to.be.equal(0)
    expect(stats[0].rewardPerBlock).to.be.equal(tokens(0))
    expect(stats[0].earned).to.be.equal("17777777777760000000")
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )
    expect((await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber()))[0].multiplier).to.be.equal(
      await minter.accMultiplierForStakings()
    )

    expect(await minter.getStakings()).to.have.length(1)
    expect(await minter.unregisterStaking(earning.address))
    expect(await minter.getStakings()).to.have.length(0)

    await expect(minter.setXYZ(0, tokens(20))).not.to.be.reverted

    await advanceBlockTo(await ethers.provider, (await ethers.provider.getBlockNumber()) + 15)
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )

    await minter.connect(dev).registerStaking(earning.address, 5)
    expect(await minter.getStakings()).to.have.length(1)
    expect((await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber()))[0].multiplier).to.be.equal(
      await minter.accMultiplierForStakings()
    )

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )
    await advanceBlockTo(ethers.provider, (await ethers.provider.getBlockNumber()) + 1)

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )

    await minter.changeMultiplierStaking(earning.address, 100)
    expect((await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber()))[0].multiplier).to.be.equal(
      await minter.accMultiplierForStakings()
    )
    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "17777"
    )

    await expect(minter.setXYZ(100, tokens(15))).not.to.be.reverted
    expect((await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber()))[0].rewardPerBlock).to.be.equal(
      tokens(5)
    )

    await advanceBlockTo(ethers.provider, (await ethers.provider.getBlockNumber()) + 1)

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "20277"
    )

    await expect(minter.setXYZ(0, tokens(15))).not.to.be.reverted
    expect((await minter.getStatusStaking(await bob.getAddress(), await ethers.provider.getBlockNumber()))[0].rewardPerBlock).to.be.equal(
      tokens(0)
    )

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "22777"
    )

    await advanceBlockTo(ethers.provider, (await ethers.provider.getBlockNumber()) + 15)

    expect((await earning.pendingReward(await bob.getAddress(), await ethers.provider.getBlockNumber())).div(1e15).toString()).to.be.equal(
      "22777"
    )

    expect(await token.balanceOf(await bob.getAddress())).to.be.equal(tokens(90))
    await earning.connect(bob).withdraw(await earning.deposited(await bob.getAddress()))
    expect((await earning.deposited(await bob.getAddress())).div(1e15).toString()).to.be.equal("0")
    expect(await token.balanceOf(await bob.getAddress())).to.be.equal(tokens(125))
    await earning.connect(bob).getReward()
    expect(await token.balanceOf(await bob.getAddress())).to.be.equal("147777777777755000000") // close to 147 tokens..

    await earning.connect(alice).deposit("999999965000000000000000000")
    expect(await token.balanceOf(await alice.getAddress())).to.be.equal("0") // close to 147 tokens..

    await minter.setDev(await dev.getAddress())
    await minter.devPull()
    await minter.devPull()

    expect((await token.balanceOf(await dev.getAddress())).toString()).to.be.equal("4777777777775500000")
  })
})
