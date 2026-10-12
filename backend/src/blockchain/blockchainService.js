const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.HARDHAT_RPC_URL);
    this.wallet = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, this.provider);
    this.contracts = {};
    this.initContracts();
  }

  loadAbi(contractName) {
    const artifactPath = path.resolve(
      __dirname,
      `../../../contracts/artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact.abi;
    }
    return [];
  }

  getDeployedAddresses() {
    const manifestPath = path.resolve(__dirname, 'deployedContracts.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return manifest.contracts;
    }
    return {
      ElectionManager: env.ELECTION_MANAGER_ADDRESS,
      ProofVerifier: env.PROOF_VERIFIER_ADDRESS,
      Voting: env.VOTING_CONTRACT_ADDRESS,
      TallyRegistry: env.TALLY_REGISTRY_ADDRESS,
    };
  }

  initContracts() {
    try {
      const addresses = this.getDeployedAddresses();

      const electionManagerAbi = this.loadAbi('ElectionManager');
      const votingAbi = this.loadAbi('Voting');
      const tallyRegistryAbi = this.loadAbi('TallyRegistry');
      const proofVerifierAbi = this.loadAbi('ProofVerifier');

      if (addresses.ElectionManager && electionManagerAbi.length > 0) {
        this.contracts.electionManager = new ethers.Contract(
          addresses.ElectionManager,
          electionManagerAbi,
          this.wallet
        );
      }

      if (addresses.Voting && votingAbi.length > 0) {
        this.contracts.voting = new ethers.Contract(
          addresses.Voting,
          votingAbi,
          this.wallet
        );
      }

      if (addresses.TallyRegistry && tallyRegistryAbi.length > 0) {
        this.contracts.tallyRegistry = new ethers.Contract(
          addresses.TallyRegistry,
          tallyRegistryAbi,
          this.wallet
        );
      }

      if (addresses.ProofVerifier && proofVerifierAbi.length > 0) {
        this.contracts.proofVerifier = new ethers.Contract(
          addresses.ProofVerifier,
          proofVerifierAbi,
          this.wallet
        );
      }
    } catch (err) {
      console.warn('[BlockchainService] Contract initialization warning:', err.message);
    }
  }

  /**
   * Relay anonymous ballot transaction to on-chain Voting contract
   */
  async relayBallot({ onChainElectionId, nullifier, ballotCommitment, encryptedBallot, leafCommitment, merkleProof }) {
    if (!this.contracts.voting) {
      throw new Error('Voting contract is not configured on blockchain service.');
    }

    const tx = await this.contracts.voting.castBallot(
      BigInt(onChainElectionId),
      nullifier,
      ballotCommitment,
      encryptedBallot,
      leafCommitment,
      merkleProof
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Check if nullifier is used on-chain
   */
  async isNullifierUsed(onChainElectionId, nullifier) {
    if (!this.contracts.voting) return false;
    return this.contracts.voting.isNullifierUsed(BigInt(onChainElectionId), nullifier);
  }

  /**
   * Fetch all accepted ballots from on-chain Voting contract for tallying
   */
  async fetchOnChainBallots(onChainElectionId) {
    if (!this.contracts.voting) return [];
    const count = await this.contracts.voting.getBallotCount(BigInt(onChainElectionId));
    const ballots = [];

    for (let i = 0; i < Number(count); i++) {
      const record = await this.contracts.voting.getBallot(BigInt(onChainElectionId), i);
      ballots.push({
        index: i,
        nullifier: record.nullifier,
        ballotCommitment: record.ballotCommitment,
        encryptedBallot: record.encryptedBallot,
        timestamp: Number(record.timestamp),
      });
    }

    return ballots;
  }

  /**
   * Publish tally on-chain in TallyRegistry
   */
  async publishTallyOnChain({ onChainElectionId, tallyCommitment, candidateVotes, trusteeProofReference }) {
    if (!this.contracts.tallyRegistry) {
      throw new Error('TallyRegistry contract is not configured on blockchain service.');
    }

    const tx = await this.contracts.tallyRegistry.publishTally(
      BigInt(onChainElectionId),
      tallyCommitment,
      candidateVotes.map((v) => BigInt(v)),
      trusteeProofReference
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }
}

module.exports = new BlockchainService();
