// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


interface IElectionManager {
    enum ElectionState {
        DRAFT,
        FROZEN,
        OPEN,
        CLOSED,
        PUBLISHED
    }

    struct ElectionConfig {
        uint256 electionId;
        string title;
        uint256 startTime;
        uint256 endTime;
        ElectionState state;
        bytes32 credentialRoot;
        string encryptionPublicKey;
        uint256 candidateCount;
        bool exists;
    }

    function getElection(uint256 _electionId) external view returns (ElectionConfig memory);
    function setPublished(uint256 _electionId) external;
}

interface IVoting {
    function getBallotCount(uint256 _electionId) external view returns (uint256);
}

/**
 * @title TallyRegistry
 * @notice Maintains aggregate tally commitments, trustee decryption proofs,
 * and final verifiable election result publication status.
 */
contract TallyRegistry {
    address public owner;
    IElectionManager public electionManager;
    IVoting public votingContract;

    struct TallyResult {
        bytes32 tallyCommitment;
        uint256[] candidateVotes;
        bool isPublished;
    }

    // Mapping: electionId => TallyResult
    mapping(uint256 => TallyResult) internal tallyResults;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TallyPublished(
        uint256 indexed electionId,
        bytes32 indexed tallyCommitment,
        uint256 totalBallotsCounted,
        string trusteeProofReference,
        uint256 timestamp
    );

    error Unauthorized();
    error ElectionNotClosed(uint256 electionId);
    error TallyAlreadyPublished(uint256 electionId);
    error BallotCountMismatch(uint256 counted, uint256 actualOnChain);
    error InvalidCandidateVotes();
    error InvalidAddress();
    error TallyNotPublished();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _electionManager, address _votingContract) {
        if (_electionManager == address(0) || _votingContract == address(0)) {
            revert InvalidAddress();
        }
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        electionManager = IElectionManager(_electionManager);
        votingContract = IVoting(_votingContract);
    }

    /**
     * @notice Publish final verified tally after election closure
     * @param _electionId The election identifier
     * @param _tallyCommitment Cryptographic commitment Hash(candidateVotes, blinding)
     * @param _candidateVotes Array of vote counts for each candidate index
     * @param _trusteeProofReference URI/Hash of trustee decryption shares proof
     */
    function publishTally(
        uint256 _electionId,
        bytes32 _tallyCommitment,
        uint256[] calldata _candidateVotes,
        string calldata _trusteeProofReference
    ) external onlyOwner {
        IElectionManager.ElectionConfig memory config = electionManager.getElection(_electionId);
        
        // 1. Enforce that election must be CLOSED
        if (config.state != IElectionManager.ElectionState.CLOSED) {
            revert ElectionNotClosed(_electionId);
        }

        // 2. Enforce that tally has not already been published
        if (tallyResults[_electionId].isPublished) {
            revert TallyAlreadyPublished(_electionId);
        }

        if (_candidateVotes.length != config.candidateCount) {
            revert InvalidCandidateVotes();
        }

        // 3. Reconcile total ballots counted against on-chain Voting contract
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < _candidateVotes.length; i++) {
            totalVotes += _candidateVotes[i];
        }

        uint256 onChainBallotCount = votingContract.getBallotCount(_electionId);
        if (totalVotes != onChainBallotCount) {
            revert BallotCountMismatch(totalVotes, onChainBallotCount);
        }

        // 4. Record tally
        tallyResults[_electionId] = TallyResult({
            tallyCommitment: _tallyCommitment,
            candidateVotes: _candidateVotes,
            isPublished: true
        });

        // 5. Update election state to PUBLISHED in ElectionManager
        electionManager.setPublished(_electionId);

        emit TallyPublished(
            _electionId,
            _tallyCommitment,
            totalVotes,
            _trusteeProofReference,
            block.timestamp
        );
    }

    /**
     * @notice Retrieve candidate votes for a published election
     */
    function getCandidateVotes(uint256 _electionId) external view returns (uint256[] memory) {
        if (!tallyResults[_electionId].isPublished) revert TallyNotPublished();
        return tallyResults[_electionId].candidateVotes;
    }

    /**
     * @notice Check if tally is published
     */
    function isTallyPublished(uint256 _electionId) external view returns (bool) {
        return tallyResults[_electionId].isPublished;
    }
}
