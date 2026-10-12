const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`[Deployment] Deploying contracts with account: ${deployer.address}`);

  // 1. Deploy ElectionManager
  const ElectionManagerFactory = await ethers.getContractFactory("ElectionManager");
  const electionManager = await ElectionManagerFactory.deploy();
  await electionManager.waitForDeployment();
  const electionManagerAddress = await electionManager.getAddress();
  console.log(`[Deployed] ElectionManager: ${electionManagerAddress}`);

  // 2. Deploy ProofVerifier
  const ProofVerifierFactory = await ethers.getContractFactory("ProofVerifier");
  const proofVerifier = await ProofVerifierFactory.deploy();
  await proofVerifier.waitForDeployment();
  const proofVerifierAddress = await proofVerifier.getAddress();
  console.log(`[Deployed] ProofVerifier:   ${proofVerifierAddress}`);

  // 3. Deploy Voting
  const VotingFactory = await ethers.getContractFactory("Voting");
  const voting = await VotingFactory.deploy(electionManagerAddress, proofVerifierAddress);
  await voting.waitForDeployment();
  const votingAddress = await voting.getAddress();
  console.log(`[Deployed] Voting:          ${votingAddress}`);

  // 4. Deploy TallyRegistry
  const TallyRegistryFactory = await ethers.getContractFactory("TallyRegistry");
  const tallyRegistry = await TallyRegistryFactory.deploy(electionManagerAddress, votingAddress);
  await tallyRegistry.waitForDeployment();
  const tallyRegistryAddress = await tallyRegistry.getAddress();
  console.log(`[Deployed] TallyRegistry:   ${tallyRegistryAddress}`);

  // 5. Link Contracts
  const tx1 = await electionManager.setVotingContract(votingAddress);
  await tx1.wait();
  const tx2 = await electionManager.setTallyRegistry(tallyRegistryAddress);
  await tx2.wait();
  console.log(`[Configured] ElectionManager linked to Voting and TallyRegistry contracts`);

  // Write deployment manifest to a shared json file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name || "hardhat",
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ElectionManager: electionManagerAddress,
      ProofVerifier: proofVerifierAddress,
      Voting: votingAddress,
      TallyRegistry: tallyRegistryAddress,
    },
  };

  const outputDir = path.resolve(__dirname, "../../backend/src/blockchain");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "deployedContracts.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`[Saved] Deployment manifest written to backend/src/blockchain/deployedContracts.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Deployment Error]", error);
    process.exit(1);
  });
