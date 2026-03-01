const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking Contract", function () {
  let staking;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy();
    await staking.waitForDeployment();
  });

  // -------------------------
  // STAKE
  // -------------------------
  it("should allow a user to stake ETH", async function () {
    await staking.connect(user).stake({
      value: ethers.parseEther("1"),
    });

    const balance = await staking.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });

  // -------------------------
  // WITHDRAW
  // -------------------------
  it("should allow a user to withdraw ETH", async function () {
    await staking.connect(user).stake({
      value: ethers.parseEther("1"),
    });

    await staking.connect(user).withdraw(ethers.parseEther("0.5"));

    const balance = await staking.getBalance(user.address);

    const expected = ethers.parseEther("0.5");
    const tolerance = ethers.parseEther("0.001"); // reward allowance

    expect(balance).to.be.closeTo(expected, tolerance);
  });

  // -------------------------
  // REWARD ACCUMULATION
  // -------------------------
  it("should accumulate rewards over time", async function () {
    await staking.connect(user).stake({
      value: ethers.parseEther("1"),
    });

    // simulate 30 days
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const rewards = await staking.getPendingRewards(user.address);
    expect(rewards).to.be.gt(0);
  });

  // -------------------------
  // CLAIM REWARDS
  // -------------------------
  it("should allow a user to claim rewards", async function () {
    await staking.connect(user).stake({
      value: ethers.parseEther("1"),
    });

    await ethers.provider.send("evm_increaseTime", [60 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const balanceBefore = await ethers.provider.getBalance(user.address);

    const tx = await staking.connect(user).claimRewards();
    const receipt = await tx.wait();

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(user.address);

    expect(balanceAfter).to.be.gt(balanceBefore - gasCost);
  });

  // -------------------------
  // SECURITY: FAIL CASES
  // -------------------------
  it("should revert if user withdraws more than balance", async function () {
    await staking.connect(user).stake({
      value: ethers.parseEther("1"),
    });

    await expect(
      staking.connect(user).withdraw(ethers.parseEther("2"))
    ).to.be.reverted;
  });

  it("should revert if user claims rewards without staking", async function () {
    await expect(
      staking.connect(user).claimRewards()
    ).to.be.reverted;
  });
});
