import { ethers, upgrades } from "hardhat"

import { expect } from "chai"
import { Contract, Signer } from "ethers"
import { bytes32, timeout, wait, now, timeoutAppended, advanceBlockTo, getCurrentBlock } from "./utils/utils"
import { LiquifiV2Token, MinterV2, FarmingV2 } from "../typechain"

import { tokens } from "./utils/utils"

describe("Liquifi Earning V2", async () => {
  let dev: Signer

  let earning1: FarmingV2
  let earning2: FarmingV2
  let token: LiquifiV2Token
  let minter: MinterV2

  beforeEach(async () => {
    ;[dev] = await ethers.getSigners()

    token = (await (await ethers.getContractFactory("LiquifiV2Token"))
      .connect(dev)
      .deploy("Liquifi V2 Token", "L2T", await dev.getAddress())) as LiquifiV2Token

    const Contract = await ethers.getContractFactory("MinterV2")
    minter = (await upgrades.deployProxy(Contract, [token.address, tokens(20)])) as MinterV2

    await token.connect(dev).setMinter(minter.address)
  })

  it("should work", async () => {
    const Contract = await ethers.getContractFactory("FarmingV2")
    earning1 = (await upgrades.deployProxy(Contract, [token.address, minter.address, await dev.getAddress()])) as FarmingV2
    earning2 = (await upgrades.deployProxy(Contract, [token.address, minter.address, await dev.getAddress()])) as FarmingV2

    console.log(await minter.getStatusFarms(await dev.getAddress(), await ethers.provider.getBlockNumber()))

    await minter.registerFactory(await dev.getAddress())

    await minter.registerFarm(earning1.address, 2)
    await minter.registerStaking(earning2.address, 5)

    await minter.setXYZ(50, tokens(10))

    console.log(await minter.getStatusFarms(await dev.getAddress(), await ethers.provider.getBlockNumber()))
    console.log(await minter.getStatusStaking(await dev.getAddress(), await ethers.provider.getBlockNumber()))

    await minter.unregisterFarm(earning1.address)

    console.log(await minter.accMultiplierForStakings())
    console.log(await minter.accMultiplierForFarms())

    console.log("-------------------")
    console.log(await minter.getFarms())
    console.log(await minter.getStatusFarms(await dev.getAddress(), await ethers.provider.getBlockNumber()))
  })
})
