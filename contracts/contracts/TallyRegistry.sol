// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ElectionManager.sol";
import "./Voting.sol";

/**
 * @title TallyRegistry
 * @notice Maintains aggregate tally commitments, trustee decryption proofs,
 * and final verifiable election result publication status.
 */
contract TallyRegistry is Ownable {
    ElectionManager public electionManager;
    Voting public votingContract;

    struct TallyResult {
        uint256 electionId;
        bytes32 tallyCommitment;
        uint256[] candidateVotes;
        uint256 totalBallotsCounted;
        string trusteeProofReference;
        bool isPublished;
        uint256 publishedAt;
    }

    // Mapping: electionId => TallyResult
    mapping(uint256 => TallyResult) public tallyResults;

    event TallyPublished(
        uint256 indexed electionId,
        bytes32 indexed tallyCommitment,
        uint256 totalBallotsCounted,
        string trusteeProofReference,
        uint256 timestamp
    );

    error ElectionNotClosed(uint256 electionId);
    error TallyAlreadyPublished(uint256 electionId);
    error BallotCountMismatch(uint256 counted, uint256 actualOnChain);
    error InvalidCandidateVotes();

    constructor(address _electionManager, address _votingContract) Ownable(msg.sender) {
        require(_electionManager != address(0), "Invalid ElectionManager");
        require(_votingContract != address(0), "Invalid Voting contract");
        electionManager = ElectionManager(_electionManager);
        votingContract = Voting(_votingContract);
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
        ElectionManager.ElectionConfig memory config = electionManager.getElection(_electionId);
        
        // 1. Enforce that election must be CLOSED
        if (config.state != ElectionManager.ElectionState.CLOSED) {
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
            electionId: _electionId,
            tallyCommitment: _tallyCommitment,
            candidateVotes: _candidateVotes,
            totalBallotsCounted: totalVotes,
            trusteeProofReference: _trusteeProofReference,
            isPublished: true,
            publishedAt: block.timestamp
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
        require(tallyResults[_electionId].isPublished, "Tally not yet published");
        return tallyResults[_electionId].candidateVotes;
    }

    /**
     * @notice Check if tally is published
     */
    function isTallyPublished(uint256 _electionId) external view returns (bool) {
        return tallyResults[_electionId].isPublished;
    }
}
