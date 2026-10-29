const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`[Deployment] Deploying contracts with account: ${deployer.address}`);

  // 1. ElectionManager
  let electionManagerAddress = process.env.ELECTION_MANAGER_ADDRESS || "0x54B0D3FeA52FfD4861B69f314A96FA567de20244";
  const ElectionManagerFactory = await ethers.getContractFactory("ElectionManager");
  let electionManager;
  if (electionManagerAddress) {
    electionManager = ElectionManagerFactory.attach(electionManagerAddress);
    console.log(`[Reusing] Deployed ElectionManager at: ${electionManagerAddress}`);
  } else {
    electionManager = await ElectionManagerFactory.deploy();
    await electionManager.waitForDeployment();
    electionManagerAddress = await electionManager.getAddress();
    console.log(`[Deployed] ElectionManager: ${electionManagerAddress}`);
  }

  // 2. ProofVerifier
  let proofVerifierAddress = process.env.PROOF_VERIFIER_ADDRESS || "0x18FC4B499eF3eE5f99d9cECeaB2349BF31c06DFc";
  const ProofVerifierFactory = await ethers.getContractFactory("ProofVerifier");
  let proofVerifier;
  if (proofVerifierAddress) {
    proofVerifier = ProofVerifierFactory.attach(proofVerifierAddress);
    console.log(`[Reusing] Deployed ProofVerifier at:   ${proofVerifierAddress}`);
  } else {
    proofVerifier = await ProofVerifierFactory.deploy();
    await proofVerifier.waitForDeployment();
    proofVerifierAddress = await proofVerifier.getAddress();
    console.log(`[Deployed] ProofVerifier:   ${proofVerifierAddress}`);
  }

  // 3. Voting
  let votingAddress = process.env.VOTING_CONTRACT_ADDRESS || "0x299757d2151DB040937034f83c901612a3e15d04";
  const VotingFactory = await ethers.getContractFactory("Voting");
  let voting;
  if (votingAddress) {
    voting = VotingFactory.attach(votingAddress);
    console.log(`[Reusing] Deployed Voting at:          ${votingAddress}`);
  } else {
    voting = await VotingFactory.deploy(electionManagerAddress, proofVerifierAddress);
    await voting.waitForDeployment();
    votingAddress = await voting.getAddress();
    console.log(`[Deployed] Voting:          ${votingAddress}`);
  }

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

  // Update root .env
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(/ELECTION_MANAGER_ADDRESS=.*/, `ELECTION_MANAGER_ADDRESS=${electionManagerAddress}`);
    envContent = envContent.replace(/PROOF_VERIFIER_ADDRESS=.*/, `PROOF_VERIFIER_ADDRESS=${proofVerifierAddress}`);
    envContent = envContent.replace(/VOTING_CONTRACT_ADDRESS=.*/, `VOTING_CONTRACT_ADDRESS=${votingAddress}`);
    envContent = envContent.replace(/TALLY_REGISTRY_ADDRESS=.*/, `TALLY_REGISTRY_ADDRESS=${tallyRegistryAddress}`);
    if (!envContent.includes("BLOCKCHAIN_RPC_URL=")) {
      envContent += "\nBLOCKCHAIN_RPC_URL=https://polygon-amoy-bor-rpc.publicnode.com\n";
    }
    fs.writeFileSync(envPath, envContent);
    console.log(`[Updated] Root .env updated with deployed contract addresses & RPC`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Deployment Error]", error);
    process.exit(1);
  });
