const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Blockchain-Based Voting System: Smart Contracts Test Suite", function () {
  let electionManager;
  let proofVerifier;
  let voting;
  let tallyRegistry;
  let owner;
  let voter1;
  let voter2;
  let attacker;

  const electionId = 101;
  const startTime = Math.floor(Date.now() / 1000) - 60; // 1 min ago
  const endTime = startTime + 3600; // 1 hour later
  const mockPubKey = "0x04test_encryption_public_key";

  // Helper function to build Merkle Tree in JS
  function hashPair(a, b) {
    const [left, right] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
    return ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [left, right]);
  }

  function getProof(leaves, leaf) {
    const index = leaves.indexOf(leaf);
    const proof = [];
    let currentLevel = [...leaves];
    let idx = index;

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      if (siblingIdx < currentLevel.length) {
        proof.push(currentLevel[siblingIdx]);
      }
      idx = Math.floor(idx / 2);
      currentLevel = nextLevel;
    }
    return proof;
  }

  beforeEach(async function () {
    [owner, voter1, voter2, attacker] = await ethers.getSigners();

    // 1. Deploy ElectionManager
    const ElectionManagerFactory = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManagerFactory.deploy();
    await electionManager.waitForDeployment();

    // 2. Deploy ProofVerifier
    const ProofVerifierFactory = await ethers.getContractFactory("ProofVerifier");
    proofVerifier = await ProofVerifierFactory.deploy();
    await proofVerifier.waitForDeployment();

    // 3. Deploy Voting
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy(
      await electionManager.getAddress(),
      await proofVerifier.getAddress()
    );
    await voting.waitForDeployment();

    // 4. Deploy TallyRegistry
    const TallyRegistryFactory = await ethers.getContractFactory("TallyRegistry");
    tallyRegistry = await TallyRegistryFactory.deploy(
      await electionManager.getAddress(),
      await voting.getAddress()
    );
    await tallyRegistry.waitForDeployment();

    // Link Voting and TallyRegistry in ElectionManager
    await electionManager.setVotingContract(await voting.getAddress());
    await electionManager.setTallyRegistry(await tallyRegistry.getAddress());
  });

  describe("1. Election Creation and Lifecycle", function () {
    it("should create an election in DRAFT state", async function () {
      await electionManager.createElection(electionId, "Presidential Election 2026", startTime, endTime, mockPubKey);
      const election = await electionManager.getElection(electionId);
      expect(election.exists).to.be.true;
      expect(election.state).to.equal(0); // DRAFT
      expect(election.candidateCount).to.equal(0);
    });

    it("should prevent non-owners from creating elections", async function () {
      await expect(
        electionManager.connect(attacker).createElection(electionId, "Fraud Election", startTime, endTime, mockPubKey)
      ).to.be.revertedWithCustomError(electionManager, "OwnableUnauthorizedAccount");
    });

    it("should register candidates in DRAFT state", async function () {
      await electionManager.createElection(electionId, "Presidential Election 2026", startTime, endTime, mockPubKey);
      await electionManager.registerCandidate(electionId, "Democratic Alliance");
      await electionManager.registerCandidate(electionId, "Progressive Coalition");

      const election = await electionManager.getElection(electionId);
      expect(election.candidateCount).to.equal(2);
    });

    it("should prevent freezing with fewer than 2 candidates", async function () {
      await electionManager.createElection(electionId, "Presidential Election 2026", startTime, endTime, mockPubKey);
      await electionManager.registerCandidate(electionId, "Solo Candidate");
      
      const mockRoot = ethers.keccak256(ethers.toUtf8Bytes("mock_root"));
      await expect(
        electionManager.freezeElection(electionId, mockRoot)
      ).to.be.revertedWithCustomError(electionManager, "InsufficientCandidates");
    });
  });

  describe("2. Freezing & Anonymous Credential Voting", function () {
    let leaf1, leaf2, root, proof1, nullifier1, nullifier2;
    const secret1 = ethers.keccak256(ethers.toUtf8Bytes("secret_voter_1"));
    const salt1 = ethers.keccak256(ethers.toUtf8Bytes("salt_1"));
    const secret2 = ethers.keccak256(ethers.toUtf8Bytes("secret_voter_2"));
    const salt2 = ethers.keccak256(ethers.toUtf8Bytes("salt_2"));

    beforeEach(async function () {
      // Create election
      await electionManager.createElection(electionId, "General Election", startTime, endTime, mockPubKey);
      await electionManager.registerCandidate(electionId, "Party A");
      await electionManager.registerCandidate(electionId, "Party B");

      // Generate voter commitments
      leaf1 = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [secret1, salt1]);
      leaf2 = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [secret2, salt2]);

      // Merkle root and proof
      root = hashPair(leaf1, leaf2);
      proof1 = [leaf2]; // Sibling for leaf1

      // Nullifiers: Hash(secret, electionId)
      nullifier1 = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [secret1, electionId]);
      nullifier2 = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [secret2, electionId]);

      // Freeze election with commitment root
      await electionManager.freezeElection(electionId, root);
    });

    it("should transition state to FROZEN with valid Merkle root", async function () {
      const election = await electionManager.getElection(electionId);
      expect(election.state).to.equal(1); // FROZEN
      expect(election.credentialRoot).to.equal(root);
    });

    it("should reject ballot submission before election is OPEN", async function () {
      const ballotCommitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_1"));
      const encryptedBallot = ethers.toUtf8Bytes("encrypted_payload_1");

      await expect(
        voting.castBallot(electionId, nullifier1, ballotCommitment, encryptedBallot, leaf1, proof1)
      ).to.be.revertedWithCustomError(voting, "ElectionNotOpen");
    });

    it("should accept valid ballot and consume nullifier when OPEN", async function () {
      await electionManager.openElection(electionId);

      const ballotCommitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_1"));
      const encryptedBallot = ethers.toUtf8Bytes("encrypted_payload_1");

      const tx = await voting.castBallot(
        electionId,
        nullifier1,
        ballotCommitment,
        encryptedBallot,
        leaf1,
        proof1
      );
      await tx.wait();

      // Check nullifier is marked used
      expect(await voting.isNullifierUsed(electionId, nullifier1)).to.be.true;
      expect(await voting.getBallotCount(electionId)).to.equal(1);

      // Verify ballot stored on-chain
      const record = await voting.getBallot(electionId, 0);
      expect(record.nullifier).to.equal(nullifier1);
      expect(record.ballotCommitment).to.equal(ballotCommitment);
    });

    it("CRITICAL RULE: Rejects double-voting with identical nullifier", async function () {
      await electionManager.openElection(electionId);

      const ballotCommitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_1"));
      const encryptedBallot = ethers.toUtf8Bytes("encrypted_payload_1");

      // First vote: Successful
      await voting.castBallot(
        electionId,
        nullifier1,
        ballotCommitment,
        encryptedBallot,
        leaf1,
        proof1
      );

      // Second vote with same nullifier: MUST revert with NullifierAlreadyUsed
      await expect(
        voting.castBallot(
          electionId,
          nullifier1,
          ballotCommitment,
          encryptedBallot,
          leaf1,
          proof1
        )
      ).to.be.revertedWithCustomError(voting, "NullifierAlreadyUsed");
    });

    it("Rejects ballot with invalid/forged Merkle membership proof", async function () {
      await electionManager.openElection(electionId);

      const forgedProof = [ethers.keccak256(ethers.toUtf8Bytes("fake_sibling"))];
      const ballotCommitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_fake"));
      const encryptedBallot = ethers.toUtf8Bytes("encrypted_payload_fake");

      await expect(
        voting.castBallot(
          electionId,
          nullifier1,
          ballotCommitment,
          encryptedBallot,
          leaf1,
          forgedProof
        )
      ).to.be.revertedWithCustomError(proofVerifier, "MerkleRootMismatch");
    });
  });

  describe("3. Election Closing and Verifiable Tally Publication", function () {
    let leaf1, root, proof1, nullifier1;

    beforeEach(async function () {
      await electionManager.createElection(electionId, "Civic Election", startTime, endTime, mockPubKey);
      await electionManager.registerCandidate(electionId, "Party Red");
      await electionManager.registerCandidate(electionId, "Party Blue");

      const secret = ethers.keccak256(ethers.toUtf8Bytes("voter_secret"));
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      leaf1 = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [secret, salt]);
      nullifier1 = ethers.solidityPackedKeccak256(["bytes32", "uint256"], [secret, electionId]);

      root = leaf1; // Single leaf tree
      proof1 = [];

      await electionManager.freezeElection(electionId, root);
      await electionManager.openElection(electionId);

      // Cast 1 valid vote for Party Red (index 0)
      const ballotCommitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_choice_0"));
      const encryptedBallot = ethers.toUtf8Bytes("enc_vote_0");
      await voting.castBallot(electionId, nullifier1, ballotCommitment, encryptedBallot, leaf1, proof1);
    });

    it("should reject tally publication while election is still OPEN", async function () {
      const tallyCommitment = ethers.keccak256(ethers.toUtf8Bytes("tally_commitment"));
      const candidateVotes = [1, 0];

      await expect(
        tallyRegistry.publishTally(electionId, tallyCommitment, candidateVotes, "ipfs://proof_hash")
      ).to.be.revertedWithCustomError(tallyRegistry, "ElectionNotClosed");
    });

    it("should reject tally publication if candidate vote count does not match on-chain ballots", async function () {
      await electionManager.closeElection(electionId);

      const tallyCommitment = ethers.keccak256(ethers.toUtf8Bytes("tally_commitment"));
      // Mismatched: 2 total votes claimed when only 1 was cast on-chain
      const fraudulentCandidateVotes = [2, 0];

      await expect(
        tallyRegistry.publishTally(electionId, tallyCommitment, fraudulentCandidateVotes, "ipfs://proof_hash")
      ).to.be.revertedWithCustomError(tallyRegistry, "BallotCountMismatch");
    });

    it("should successfully publish tally when closed and reconciled", async function () {
      await electionManager.closeElection(electionId);

      const tallyCommitment = ethers.keccak256(ethers.toUtf8Bytes("tally_commitment"));
      const candidateVotes = [1, 0]; // 1 for Party Red, 0 for Party Blue

      const tx = await tallyRegistry.publishTally(
        electionId,
        tallyCommitment,
        candidateVotes,
        "ipfs://trustee_decryption_proof_123"
      );
      await tx.wait();

      expect(await tallyRegistry.isTallyPublished(electionId)).to.be.true;

      const votes = await tallyRegistry.getCandidateVotes(electionId);
      expect(votes[0]).to.equal(1);
      expect(votes[1]).to.equal(0);

      const election = await electionManager.getElection(electionId);
      expect(election.state).to.equal(4); // PUBLISHED
    });
  });
});
