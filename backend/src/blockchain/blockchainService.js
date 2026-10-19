const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.HARDHAT_RPC_URL);
    this.wallet = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, this.provider);
    this.contracts = {};
    this.currentNonce = null;
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

  async getNextNonce() {
    const chainNonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');
    if (this.currentNonce === null || chainNonce > this.currentNonce) {
      this.currentNonce = chainNonce;
    } else {
      this.currentNonce++;
    }
    return this.currentNonce;
  }

  /**
   * Ensure election exists and is in OPEN state on the smart contract
   */
  async ensureElectionOpenOnChain({
    onChainElectionId,
    title = 'University Election',
    startTime = Math.floor(Date.now() / 1000) - 3600,
    endTime = Math.floor(Date.now() / 1000) + 86400,
    encryptionPublicKey = '0x00',
    credentialRoot = '0x' + '1'.repeat(64),
    leafCommitment = null,
  }) {
    if (!this.contracts.electionManager) {
      console.warn('[BlockchainService] ElectionManager not initialized');
      return;
    }

    const id = BigInt(onChainElectionId);
    let isOpen = false;
    try {
      isOpen = await this.contracts.electionManager.isElectionOpen(id);
    } catch (e) {
      isOpen = false;
    }

    if (isOpen) {
      return;
    }

    console.log(`[BlockchainService] Syncing election ${onChainElectionId} on-chain to OPEN state...`);

    let electionExists = false;
    let state = 0; // 0: DRAFT, 1: FROZEN, 2: OPEN, 3: CLOSED, 4: PUBLISHED
    let candidateCount = 0;

    try {
      const el = await this.contracts.electionManager.getElection(id);
      electionExists = el.exists;
      state = Number(el.state);
      candidateCount = Number(el.candidateCount);
    } catch (e) {
      electionExists = false;
    }

    if (!electionExists) {
      console.log(`[BlockchainService] Creating election ${onChainElectionId} on ElectionManager...`);
      const nonce = await this.getNextNonce();
      const createTx = await this.contracts.electionManager.createElection(
        id,
        title || 'University Civic Election',
        BigInt(startTime || Math.floor(Date.now() / 1000) - 3600),
        BigInt(endTime || Math.floor(Date.now() / 1000) + 86400),
        encryptionPublicKey || '0x00',
        { nonce }
      );
      await createTx.wait();
      state = 0;
      candidateCount = 0;
    }

    if (state === 0) {
      // Must have at least 2 candidates before freezing
      while (candidateCount < 2) {
        const candidateName = candidateCount === 0 ? 'Candidate Alpha' : 'Candidate Beta';
        console.log(`[BlockchainService] Registering candidate "${candidateName}"...`);
        const nonce = await this.getNextNonce();
        const candTx = await this.contracts.electionManager.registerCandidate(id, candidateName, { nonce });
        await candTx.wait();
        candidateCount++;
      }

      console.log(`[BlockchainService] Freezing election ${onChainElectionId} with credentialRoot ${credentialRoot}...`);
      const isDummy =
        !credentialRoot ||
        credentialRoot === '0x' ||
        credentialRoot.startsWith('0x11111111') ||
        credentialRoot.length !== 66;
      const safeRoot = !isDummy
        ? credentialRoot
        : leafCommitment && leafCommitment.length === 66
        ? leafCommitment
        : '0x' + '1'.repeat(64);
      const freezeNonce = await this.getNextNonce();
      const freezeTx = await this.contracts.electionManager.freezeElection(id, safeRoot, { nonce: freezeNonce });
      await freezeTx.wait();
      state = 1;
    }

    if (state === 1) {
      console.log(`[BlockchainService] Opening election ${onChainElectionId} on ElectionManager...`);
      const openNonce = await this.getNextNonce();
      const openTx = await this.contracts.electionManager.openElection(id, { nonce: openNonce });
      await openTx.wait();
      console.log(`[BlockchainService] Election ${onChainElectionId} is now OPEN on-chain!`);
    }
  }

  /**
   * Relay anonymous ballot transaction to on-chain Voting contract
   */
  async relayBallot({
    onChainElectionId,
    nullifier,
    ballotCommitment,
    encryptedBallot,
    leafCommitment,
    merkleProof,
    electionDetails = {},
  }) {
    if (!this.contracts.voting) {
      throw new Error('Voting contract is not configured on blockchain service.');
    }

    // Auto-sync election on-chain to OPEN state if not already open
    await this.ensureElectionOpenOnChain({
      onChainElectionId,
      title: electionDetails.title,
      startTime: electionDetails.startTime,
      endTime: electionDetails.endTime,
      encryptionPublicKey: electionDetails.encryptionPublicKey,
      credentialRoot: electionDetails.credentialRoot || leafCommitment,
      leafCommitment,
    });

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

    let count;
    try {
      count = await this.contracts.voting.getBallotCount(BigInt(onChainElectionId));
    } catch (err) {
      // Election may not exist on-chain (e.g. after Hardhat node restart)
      console.warn(`[BlockchainService] getBallotCount failed for election ${onChainElectionId}: ${err.shortMessage || err.message}`);
      return [];
    }

    const ballots = [];
    for (let i = 0; i < Number(count); i++) {
      try {
        const record = await this.contracts.voting.getBallot(BigInt(onChainElectionId), i);
        ballots.push({
          index: i,
          nullifier: record.nullifier,
          ballotCommitment: record.ballotCommitment,
          encryptedBallot: record.encryptedBallot,
          timestamp: Number(record.timestamp),
        });
      } catch (err) {
        console.warn(`[BlockchainService] getBallot(${i}) failed for election ${onChainElectionId}: ${err.shortMessage || err.message}`);
      }
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
