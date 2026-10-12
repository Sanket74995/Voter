// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ElectionManager
 * @notice Coordinates election lifecycle, candidate freeze, credential commitment roots,
 * and authorized state transitions.
 */
contract ElectionManager is Ownable {
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

    // Mapping from electionId => ElectionConfig
    mapping(uint256 => ElectionConfig) public elections;
    
    // Mapping from electionId => candidateIndex => candidateName
    mapping(uint256 => mapping(uint256 => string)) public candidateNames;

    // Authorized Voting contract address
    address public votingContract;
    // Authorized TallyRegistry contract address
    address public tallyRegistry;

    // Events
    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateRegistered(uint256 indexed electionId, uint256 indexed candidateIndex, string name);
    event ConfigurationFrozen(uint256 indexed electionId, bytes32 credentialRoot, uint256 candidateCount);
    event ElectionStateChanged(uint256 indexed electionId, ElectionState oldState, ElectionState newState);
    event VotingContractSet(address indexed votingContract);
    event TallyRegistrySet(address indexed tallyRegistry);

    // Custom errors
    error ElectionAlreadyExists(uint256 electionId);
    error ElectionNotFound(uint256 electionId);
    error InvalidStateTransition(uint256 electionId, ElectionState current, ElectionState required);
    error InvalidTimeWindow(uint256 startTime, uint256 endTime);
    error NotAuthorizedContract(address caller);
    error InsufficientCandidates(uint256 count);

    modifier onlyElectionAuthority() {
        if (msg.sender != owner() && msg.sender != votingContract && msg.sender != tallyRegistry) {
            revert NotAuthorizedContract(msg.sender);
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setVotingContract(address _votingContract) external onlyOwner {
        require(_votingContract != address(0), "Invalid address");
        votingContract = _votingContract;
        emit VotingContractSet(_votingContract);
    }

    function setTallyRegistry(address _tallyRegistry) external onlyOwner {
        require(_tallyRegistry != address(0), "Invalid address");
        tallyRegistry = _tallyRegistry;
        emit TallyRegistrySet(_tallyRegistry);
    }

    /**
     * @notice Create a new election in DRAFT state
     */
    function createElection(
        uint256 _electionId,
        string calldata _title,
        uint256 _startTime,
        uint256 _endTime,
        string calldata _encryptionPublicKey
    ) external onlyOwner {
        if (elections[_electionId].exists) {
            revert ElectionAlreadyExists(_electionId);
        }
        if (_endTime <= _startTime) {
            revert InvalidTimeWindow(_startTime, _endTime);
        }

        elections[_electionId] = ElectionConfig({
            electionId: _electionId,
            title: _title,
            startTime: _startTime,
            endTime: _endTime,
            state: ElectionState.DRAFT,
            credentialRoot: bytes32(0),
            encryptionPublicKey: _encryptionPublicKey,
            candidateCount: 0,
            exists: true
        });

        emit ElectionCreated(_electionId, _title, _startTime, _endTime);
    }

    /**
     * @notice Register a candidate/party while election is in DRAFT
     */
    function registerCandidate(
        uint256 _electionId,
        string calldata _candidateName
    ) external onlyOwner {
        ElectionConfig storage election = elections[_electionId];
        if (!election.exists) revert ElectionNotFound(_electionId);
        if (election.state != ElectionState.DRAFT) {
            revert InvalidStateTransition(_electionId, election.state, ElectionState.DRAFT);
        }

        uint256 index = election.candidateCount;
        candidateNames[_electionId][index] = _candidateName;
        election.candidateCount++;

        emit CandidateRegistered(_electionId, index, _candidateName);
    }

    /**
     * @notice Freeze configuration and register the eligible voter Merkle commitment root
     */
    function freezeElection(
        uint256 _electionId,
        bytes32 _credentialRoot
    ) external onlyOwner {
        ElectionConfig storage election = elections[_electionId];
        if (!election.exists) revert ElectionNotFound(_electionId);
        if (election.state != ElectionState.DRAFT) {
            revert InvalidStateTransition(_electionId, election.state, ElectionState.DRAFT);
        }
        if (election.candidateCount < 2) {
            revert InsufficientCandidates(election.candidateCount);
        }
        require(_credentialRoot != bytes32(0), "Invalid credential root");

        election.credentialRoot = _credentialRoot;
        election.state = ElectionState.FROZEN;

        emit ConfigurationFrozen(_electionId, _credentialRoot, election.candidateCount);
        emit ElectionStateChanged(_electionId, ElectionState.DRAFT, ElectionState.FROZEN);
    }

    /**
     * @notice Open the election for voting
     */
    function openElection(uint256 _electionId) external onlyOwner {
        ElectionConfig storage election = elections[_electionId];
        if (!election.exists) revert ElectionNotFound(_electionId);
        if (election.state != ElectionState.FROZEN) {
            revert InvalidStateTransition(_electionId, election.state, ElectionState.FROZEN);
        }

        election.state = ElectionState.OPEN;
        emit ElectionStateChanged(_electionId, ElectionState.FROZEN, ElectionState.OPEN);
    }

    /**
     * @notice Close the election when voting period concludes
     */
    function closeElection(uint256 _electionId) external onlyOwner {
        ElectionConfig storage election = elections[_electionId];
        if (!election.exists) revert ElectionNotFound(_electionId);
        if (election.state != ElectionState.OPEN) {
            revert InvalidStateTransition(_electionId, election.state, ElectionState.OPEN);
        }

        election.state = ElectionState.CLOSED;
        emit ElectionStateChanged(_electionId, ElectionState.OPEN, ElectionState.CLOSED);
    }

    /**
     * @notice Set status to published after tally is verified
     */
    function setPublished(uint256 _electionId) external onlyElectionAuthority {
        ElectionConfig storage election = elections[_electionId];
        if (!election.exists) revert ElectionNotFound(_electionId);
        if (election.state != ElectionState.CLOSED) {
            revert InvalidStateTransition(_electionId, election.state, ElectionState.CLOSED);
        }

        election.state = ElectionState.PUBLISHED;
        emit ElectionStateChanged(_electionId, ElectionState.CLOSED, ElectionState.PUBLISHED);
    }

    /**
     * @notice Get election configuration details
     */
    function getElection(uint256 _electionId) external view returns (ElectionConfig memory) {
        if (!elections[_electionId].exists) revert ElectionNotFound(_electionId);
        return elections[_electionId];
    }

    /**
     * @notice Helper to check if an election is currently open
     */
    function isElectionOpen(uint256 _electionId) external view returns (bool) {
        ElectionConfig memory election = elections[_electionId];
        return election.exists && election.state == ElectionState.OPEN;
    }
}
