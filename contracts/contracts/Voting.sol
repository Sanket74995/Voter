// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ElectionManager.sol";
import "./ProofVerifier.sol";

/**
 * @title Voting
 * @notice Receives encrypted ballots, enforces single-use nullifiers per election,
 * and records verifiable encrypted ballot commitments.
 */
contract Voting is Ownable {
    ElectionManager public electionManager;
    ProofVerifier public proofVerifier;

    // Mapping: electionId => nullifier => isUsed
    mapping(uint256 => mapping(bytes32 => bool)) public usedNullifiers;

    // Mapping: electionId => total accepted ballots
    mapping(uint256 => uint256) public acceptedBallotCounts;

    struct EncryptedBallotRecord {
        bytes32 nullifier;
        bytes32 ballotCommitment;
        bytes encryptedBallot;
        uint256 timestamp;
    }

    // Mapping: electionId => array of encrypted ballot records
    mapping(uint256 => EncryptedBallotRecord[]) private electionBallots;

    // Events
    event BallotAccepted(
        uint256 indexed electionId,
        bytes32 indexed nullifier,
        bytes32 indexed ballotCommitment,
        uint256 ballotIndex,
        uint256 timestamp
    );

    // Custom errors
    error ElectionNotOpen(uint256 electionId);
    error NullifierAlreadyUsed(uint256 electionId, bytes32 nullifier);
    error InvalidBallotData();
    error ProofVerificationFailed();

    constructor(address _electionManager, address _proofVerifier) Ownable(msg.sender) {
        require(_electionManager != address(0), "Invalid ElectionManager");
        require(_proofVerifier != address(0), "Invalid ProofVerifier");
        electionManager = ElectionManager(_electionManager);
        proofVerifier = ProofVerifier(_proofVerifier);
    }

    /**
     * @notice Cast an encrypted ballot anonymously
     * @param _electionId The election to vote in
     * @param _nullifier The deterministic single-use nullifier derived from voter's secret and electionId
     * @param _ballotCommitment Cryptographic commitment to the ballot
     * @param _encryptedBallot The ciphertext of the voter's selection
     * @param _leafCommitment Voter's registered commitment leaf
     * @param _merkleProof Sibling hashes proving inclusion in election's credentialRoot
     */
    function castBallot(
        uint256 _electionId,
        bytes32 _nullifier,
        bytes32 _ballotCommitment,
        bytes calldata _encryptedBallot,
        bytes32 _leafCommitment,
        bytes32[] calldata _merkleProof
    ) external {
        // 1. Check election is currently open
        if (!electionManager.isElectionOpen(_electionId)) {
            revert ElectionNotOpen(_electionId);
        }

        // 2. Enforce one-time voting rule via nullifier check
        if (usedNullifiers[_electionId][_nullifier]) {
            revert NullifierAlreadyUsed(_electionId, _nullifier);
        }

        // 3. Validate ballot data payload
        if (_ballotCommitment == bytes32(0) || _encryptedBallot.length == 0) {
            revert InvalidBallotData();
        }

        // 4. Retrieve election credential root
        ElectionManager.ElectionConfig memory config = electionManager.getElection(_electionId);

        // 5. Verify cryptographic membership proof
        bool isValidProof = proofVerifier.verifyCredentialProof(
            _electionId,
            config.credentialRoot,
            _nullifier,
            _leafCommitment,
            _merkleProof
        );

        if (!isValidProof) {
            revert ProofVerificationFailed();
        }

        // 6. Atomically mark nullifier as consumed
        usedNullifiers[_electionId][_nullifier] = true;

        // 7. Store encrypted ballot record
        uint256 ballotIndex = electionBallots[_electionId].length;
        electionBallots[_electionId].push(EncryptedBallotRecord({
            nullifier: _nullifier,
            ballotCommitment: _ballotCommitment,
            encryptedBallot: _encryptedBallot,
            timestamp: block.timestamp
        }));

        acceptedBallotCounts[_electionId]++;

        emit BallotAccepted(
            _electionId,
            _nullifier,
            _ballotCommitment,
            ballotIndex,
            block.timestamp
        );
    }

    /**
     * @notice Retrieve the number of ballots accepted for an election
     */
    function getBallotCount(uint256 _electionId) external view returns (uint256) {
        return acceptedBallotCounts[_electionId];
    }

    /**
     * @notice Retrieve an encrypted ballot by index for tallying & independent verification
     */
    function getBallot(uint256 _electionId, uint256 _index) external view returns (EncryptedBallotRecord memory) {
        require(_index < electionBallots[_electionId].length, "Ballot index out of bounds");
        return electionBallots[_electionId][_index];
    }

    /**
     * @notice Check whether a nullifier has been consumed
     */
    function isNullifierUsed(uint256 _electionId, bytes32 _nullifier) external view returns (bool) {
        return usedNullifiers[_electionId][_nullifier];
    }
}
