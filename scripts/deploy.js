const hre = require("hardhat");

async function main() {
  // Get the contract factory (blueprint)
  const Staking = await hre.ethers.getContractFactory("Staking");

  // Deploy contract
  const staking = await Staking.deploy();

  // Wait until deployment finishes
  await staking.waitForDeployment();

  console.log("Staking contract deployed to:", await staking.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
