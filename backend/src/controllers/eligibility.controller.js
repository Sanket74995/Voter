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
    let { commitment } = req.query;

    // Fetch all active commitments for this election
    const activeCredentials = await CredentialIssuance.find({
      electionId,
      status: 'ACTIVE',
    });

    // If commitment not specified or not in leaves, check if logged in voter has an active credential
    const leaves = activeCredentials.map((c) => c.commitment);
    let targetCommitment = commitment ? (commitment.startsWith('0x') ? commitment : '0x' + commitment) : null;

    if (!targetCommitment || !leaves.includes(targetCommitment)) {
      if (req.user?.voterId) {
        const voterCred = await CredentialIssuance.findOne({
          electionId,
          voterId: req.user.voterId,
          status: 'ACTIVE',
        });
        if (voterCred && leaves.includes(voterCred.commitment)) {
          targetCommitment = voterCred.commitment;
        }
      }
    }

    if (!targetCommitment) {
      return res.status(400).json({
        success: false,
        error: 'No active credential found for this voter/commitment in this election.',
      });
    }

    if (!leaves.includes(targetCommitment)) {
      return res.status(404).json({
        success: false,
        error: 'Commitment not found in active credentials for this election.',
      });
    }

    const tree = new CredentialMerkleTree(leaves);
    const root = tree.getRoot();
    const proof = tree.getProof(targetCommitment);

    return res.status(200).json({
      success: true,
      data: {
        electionId,
        leaf: targetCommitment,
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

/**
 * Bulk register voter eligibility for an election from uploaded list or text (Admin only)
 */
const bulkRegisterVoterEligibility = async (req, res, next) => {
  try {
    const { electionId, voterIds } = req.body;

    if (!electionId || !Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please choose an election and enter at least one Voter ID.',
      });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found. Please choose an active election.' });
    }

    if (election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'This election is already locked. New voters can only be added while the election is in Draft (setup) mode.',
      });
    }

    const results = [];
    let registeredCount = 0;

    for (const rawId of voterIds) {
      const cleanVoterId = String(rawId).trim().toUpperCase();
      if (!cleanVoterId) continue;

      const user = await User.findOne({ voterId: cleanVoterId });
      if (!user) {
        results.push({
          voterId: cleanVoterId,
          success: false,
          message: 'Voter ID not found in system',
        });
        continue;
      }

      const existingEligibility = await VoterEligibility.findOne({
        electionId,
        voterId: cleanVoterId,
      });

      if (existingEligibility) {
        results.push({
          voterId: cleanVoterId,
          success: false,
          message: 'Already added to this election',
        });
        continue;
      }

      await VoterEligibility.create({
        electionId,
        voterId: cleanVoterId,
        eligibilityStatus: 'ELIGIBLE',
        credentialIssuanceStatus: 'NOT_ISSUED',
        verifiedBy: req.user.voterId,
      });

      registeredCount++;
      results.push({
        voterId: cleanVoterId,
        success: true,
        message: 'Added to election successfully',
      });
    }

    // Update totalEligibleVoters count on election
    const totalCount = await VoterEligibility.countDocuments({
      electionId,
      eligibilityStatus: 'ELIGIBLE',
    });
    election.totalEligibleVoters = totalCount;
    await election.save();

    await logAudit({
      action: 'VOTER_ELIGIBILITY_BULK_REGISTERED',
      performedBy: req.user.voterId,
      targetType: 'ELECTION',
      targetId: election._id,
      details: { electionId, totalSubmitted: voterIds.length, registeredCount },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Bulk registration completed. ${registeredCount} registered successfully, ${voterIds.length - registeredCount} failed.`,
      data: {
        totalSubmitted: voterIds.length,
        registeredCount,
        failedCount: voterIds.length - registeredCount,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all registered voters in the system (Admin only)
 */
const getRegisteredVoters = async (req, res, next) => {
  try {
    const voters = await User.find({ role: 'voter' })
      .select('voterId fullName email phoneNumber status')
      .sort({ voterId: 1 });

    return res.status(200).json({
      success: true,
      data: { voters },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVoterEligibility,
  bulkRegisterVoterEligibility,
  getRegisteredVoters,
  checkMyEligibility,
  issueCredential,
  getCredentialProof,
  revokeCredential,
};
