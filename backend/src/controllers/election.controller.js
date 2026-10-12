const Election = require('../models/Election');
const Party = require('../models/Party');
const VoterEligibility = require('../models/VoterEligibility');
const CredentialIssuance = require('../models/CredentialIssuance');
const { CredentialMerkleTree } = require('../utils/crypto');
const { logAudit } = require('../audit/auditLogger');
const crypto = require('crypto');

/**
 * Create a new election (Admin only)
 */
const createElection = async (req, res, next) => {
  try {
    const { title, description, startTime, endTime } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Title, startTime, and endTime are required.',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End time must be later than start time.',
      });
    }

    const electionId = 'ELEC-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Generate unique election public encryption key for encrypted ballots
    const electionKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const election = await Election.create({
      electionId,
      title,
      description,
      startTime: start,
      endTime: end,
      status: 'DRAFT',
      encryptionPublicKey: electionKeyPair.publicKey,
    });

    await logAudit({
      action: 'ELECTION_CREATED',
      performedBy: req.user.voterId,
      targetType: 'ELECTION',
      targetId: election.electionId,
      details: { title: election.title, startTime, endTime },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Election created successfully in DRAFT state.',
      data: { election },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all elections
 */
const getElections = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status.toUpperCase();
    }

    const elections = await Election.find(filter).sort({ startTime: -1 });

    return res.status(200).json({
      success: true,
      count: elections.length,
      data: { elections },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get election details by electionId
 */
const getElectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({
        success: false,
        error: `Election not found with ID ${id}`,
      });
    }

    const parties = await Party.find({
      electionId: id,
      approvalStatus: 'APPROVED',
    }).sort({ candidateIndex: 1 });

    return res.status(200).json({
      success: true,
      data: {
        election,
        approvedParties: parties,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Freeze election configuration (Admin only)
 * Computes commitment Merkle root of all eligible voters and locks party list.
 */
const freezeElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    if (election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: `Cannot freeze election in status '${election.status}'. Must be in 'DRAFT'.`,
      });
    }

    const approvedPartiesCount = await Party.countDocuments({
      electionId: id,
      approvalStatus: 'APPROVED',
    });

    if (approvedPartiesCount < 2) {
      return res.status(400).json({
        success: false,
        error: 'An election must have at least 2 approved candidates/parties before freezing.',
      });
    }

    // Retrieve all active credential commitments
    const activeCredentials = await CredentialIssuance.find({
      electionId: id,
      status: 'ACTIVE',
    });

    const commitmentLeaves = activeCredentials.map((c) => c.commitment);
    const merkleTree = new CredentialMerkleTree(
      commitmentLeaves.length > 0 ? commitmentLeaves : ['0x' + '1'.repeat(64)]
    );
    const root = merkleTree.getRoot();

    election.credentialRoot = root;
    election.totalEligibleVoters = activeCredentials.length;
    election.isFrozen = true;
    election.status = 'FROZEN';
    election.configVersion += 1;
    await election.save();

    await logAudit({
      action: 'ELECTION_FROZEN',
      performedBy: req.user.voterId,
      targetType: 'ELECTION',
      targetId: election.electionId,
      details: {
        credentialRoot: root,
        totalEligibleVoters: election.totalEligibleVoters,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Election configuration frozen successfully. Commitments Merkle root registered.',
      data: { election },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Open election (Admin only)
 */
const openElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    if (election.status !== 'FROZEN' && election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: `Cannot open election from status '${election.status}'.`,
      });
    }

    election.status = 'OPEN';
    await election.save();

    await logAudit({
      action: 'ELECTION_OPENED',
      performedBy: req.user.voterId,
      targetType: 'ELECTION',
      targetId: election.electionId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Election is now OPEN for voting.',
      data: { election },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close election (Admin only)
 */
const closeElection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    if (election.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: `Cannot close election from status '${election.status}'. Must be 'OPEN'.`,
      });
    }

    election.status = 'CLOSED';
    await election.save();

    await logAudit({
      action: 'ELECTION_CLOSED',
      performedBy: req.user.voterId,
      targetType: 'ELECTION',
      targetId: election.electionId,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Election is now CLOSED. Ballots are finalized for tallying.',
      data: { election },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createElection,
  getElections,
  getElectionById,
  freezeElection,
  openElection,
  closeElection,
};
