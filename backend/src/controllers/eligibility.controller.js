const VoterEligibility = require('../models/VoterEligibility');
const CredentialIssuance = require('../models/CredentialIssuance');
const Election = require('../models/Election');
const User = require('../models/User');
const { CredentialMerkleTree } = require('../utils/crypto');
const { logAudit } = require('../audit/auditLogger');

/**
 * Register/Import voter eligibility for an election (Admin only)
 */
const registerVoterEligibility = async (req, res, next) => {
  try {
    const { electionId, voterId } = req.body;

    if (!electionId || !voterId) {
      return res.status(400).json({
        success: false,
        error: 'electionId and voterId are required.',
      });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add eligible voters after election configuration is frozen.',
      });
    }

    const cleanVoterId = voterId.trim().toUpperCase();
    const user = await User.findOne({ voterId: cleanVoterId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User with Voter ID '${cleanVoterId}' does not exist.`,
      });
    }

    const existingEligibility = await VoterEligibility.findOne({
      electionId,
      voterId: cleanVoterId,
    });

    if (existingEligibility) {
      return res.status(409).json({
        success: false,
        error: 'Voter is already registered as eligible for this election.',
      });
    }

    const eligibility = await VoterEligibility.create({
      electionId,
      voterId: cleanVoterId,
      eligibilityStatus: 'ELIGIBLE',
      credentialIssuanceStatus: 'NOT_ISSUED',
      verifiedBy: req.user.voterId,
    });

    await logAudit({
      action: 'VOTER_ELIGIBILITY_REGISTERED',
      performedBy: req.user.voterId,
      targetType: 'VOTER_ELIGIBILITY',
      targetId: eligibility._id,
      details: { electionId, voterId: cleanVoterId },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Voter eligibility registered successfully.',
      data: { eligibility },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check logged-in voter's eligibility status for an election
 */
const checkMyEligibility = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const voterId = req.user.voterId;

    const eligibility = await VoterEligibility.findOne({ electionId, voterId });
    const issuance = await CredentialIssuance.findOne({
      electionId,
      voterId,
      status: 'ACTIVE',
    }).select('-__v');

    return res.status(200).json({
      success: true,
      data: {
        isEligible: !!eligibility && eligibility.eligibilityStatus === 'ELIGIBLE',
        eligibilityStatus: eligibility ? eligibility.eligibilityStatus : 'INELIGIBLE',
        credentialStatus: eligibility ? eligibility.credentialIssuanceStatus : 'NOT_ISSUED',
        hasActiveCredential: !!issuance,
        commitment: issuance ? issuance.commitment : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue Digital Voting Credential Commitment
 * Voter provides public commitment C = Hash(sk, salt).
 * Server registers C, updates status, and returns confirmation.
 * Server NEVER sees or stores sk or salt.
 */
const issueCredential = async (req, res, next) => {
  try {
    const { electionId, commitment } = req.body;
    const voterId = req.user.voterId;

    if (!electionId || !commitment) {
      return res.status(400).json({
        success: false,
        error: 'electionId and cryptographic commitment are required.',
      });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status === 'CLOSED' || election.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        error: 'Cannot issue credentials for a closed or published election.',
      });
    }

    // Check eligibility
    const eligibility = await VoterEligibility.findOne({ electionId, voterId });
    if (!eligibility || eligibility.eligibilityStatus !== 'ELIGIBLE') {
      return res.status(403).json({
        success: false,
        error: 'Voter is not approved as eligible for this election.',
      });
    }

    if (eligibility.credentialIssuanceStatus === 'ISSUED') {
      return res.status(409).json({
        success: false,
        error: 'A voting credential has already been issued for this voter in this election.',
      });
    }

    // Ensure commitment format is 32-byte hex
    const formattedCommitment = commitment.startsWith('0x') ? commitment : '0x' + commitment;
    if (formattedCommitment.length !== 66) {
      return res.status(400).json({
        success: false,
        error: 'Commitment must be a valid 32-byte hexadecimal string (0x...).',
      });
    }

    // Check if commitment was somehow already registered
    const existingCommitment = await CredentialIssuance.findOne({
      electionId,
      commitment: formattedCommitment,
    });
    if (existingCommitment) {
      return res.status(409).json({
        success: false,
        error: 'This credential commitment has already been registered.',
      });
    }

    // Create issuance metadata record (only commitment stored)
    const issuance = await CredentialIssuance.create({
      electionId,
      voterId,
      commitment: formattedCommitment,
      status: 'ACTIVE',
    });

    eligibility.credentialIssuanceStatus = 'ISSUED';
    eligibility.credentialIssuedAt = new Date();
    await eligibility.save();

    await logAudit({
      action: 'CREDENTIAL_ISSUED',
      performedBy: voterId,
      targetType: 'CREDENTIAL',
      targetId: issuance._id,
      details: { electionId, commitmentHash: formattedCommitment.substring(0, 10) + '...' },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Digital voting credential commitment registered successfully.',
      data: {
        issuanceId: issuance._id,
        electionId,
        commitment: formattedCommitment,
        status: 'ACTIVE',
        issuedAt: issuance.issuedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Merkle Proof for a voter's registered commitment
 */
const getCredentialProof = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const { commitment } = req.query;

    if (!commitment) {
      return res.status(400).json({
        success: false,
        error: 'Commitment query parameter is required.',
      });
    }

    const formattedCommitment = commitment.startsWith('0x') ? commitment : '0x' + commitment;

    // Fetch all active commitments for this election
    const activeCredentials = await CredentialIssuance.find({
      electionId,
      status: 'ACTIVE',
    });

    const leaves = activeCredentials.map((c) => c.commitment);
    if (!leaves.includes(formattedCommitment)) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found in active credentials for this election.',
      });
    }

    const tree = new CredentialMerkleTree(leaves);
    const root = tree.getRoot();
    const proof = tree.getProof(formattedCommitment);

    return res.status(200).json({
      success: true,
      data: {
        electionId,
        leaf: formattedCommitment,
        root,
        proof,
        totalVotersInTree: leaves.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke an unused credential (Admin only)
 */
const revokeCredential = async (req, res, next) => {
  try {
    const { electionId, voterId, reason } = req.body;

    const issuance = await CredentialIssuance.findOne({
      electionId,
      voterId: voterId.toUpperCase(),
      status: 'ACTIVE',
    });

    if (!issuance) {
      return res.status(404).json({
        success: false,
        error: 'No active credential found for this voter in this election.',
      });
    }

    issuance.status = 'REVOKED';
    issuance.revokedAt = new Date();
    issuance.revocationReason = reason || 'Revoked by Election Commission Administrator';
    await issuance.save();

    await VoterEligibility.updateOne(
      { electionId, voterId: voterId.toUpperCase() },
      { credentialIssuanceStatus: 'REVOKED' }
    );

    await logAudit({
      action: 'CREDENTIAL_REVOKED',
      performedBy: req.user.voterId,
      targetType: 'CREDENTIAL',
      targetId: issuance._id,
      details: { electionId, voterId, reason },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Voting credential successfully revoked according to policy.',
      data: { issuance },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVoterEligibility,
  checkMyEligibility,
  issueCredential,
  getCredentialProof,
  revokeCredential,
};
