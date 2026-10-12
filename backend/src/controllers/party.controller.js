const Party = require('../models/Party');
const Election = require('../models/Election');
const { logAudit } = require('../audit/auditLogger');
const crypto = require('crypto');

/**
 * Register candidate / party for an election
 */
const registerParty = async (req, res, next) => {
  try {
    const { electionId, name, candidateName, symbol, symbolUrl, manifestoSummary } = req.body;

    if (!electionId || !name || !candidateName || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'electionId, name, candidateName, and symbol are required.',
      });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Cannot register candidate options once election is frozen or active.',
      });
    }

    // Determine candidate index sequentially
    const existingCount = await Party.countDocuments({ electionId });
    const candidateIndex = existingCount; // 0-based index

    const partyId = 'PTY-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Auto-approve if created by admin, otherwise PENDING
    const initialStatus = req.user.role === 'admin' ? 'APPROVED' : 'PENDING';

    const party = await Party.create({
      partyId,
      electionId,
      name,
      candidateName,
      symbol,
      symbolUrl: symbolUrl || '',
      manifestoSummary: manifestoSummary || '',
      candidateIndex,
      approvalStatus: initialStatus,
    });

    await logAudit({
      action: 'PARTY_REGISTERED',
      performedBy: req.user.voterId,
      targetType: 'PARTY',
      targetId: party.partyId,
      details: { electionId, name, candidateName, approvalStatus: initialStatus },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Party candidate registered successfully.',
      data: { party },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or reject candidate option (Admin only)
 */
const updatePartyApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'APPROVED', 'REJECTED', or 'PENDING'.",
      });
    }

    const party = await Party.findOne({ partyId: id });
    if (!party) {
      return res.status(404).json({ success: false, error: 'Party candidate not found.' });
    }

    const election = await Election.findOne({ electionId: party.electionId });
    if (election && election.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Cannot alter candidate options after election configuration is frozen.',
      });
    }

    party.approvalStatus = approvalStatus;
    await party.save();

    await logAudit({
      action: 'PARTY_APPROVAL_UPDATED',
      performedBy: req.user.voterId,
      targetType: 'PARTY',
      targetId: party.partyId,
      details: { approvalStatus },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Party candidate approval status updated to ${approvalStatus}.`,
      data: { party },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all approved parties for an election
 */
const getElectionParties = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const parties = await Party.find({
      electionId,
      approvalStatus: 'APPROVED',
    }).sort({ candidateIndex: 1 });

    return res.status(200).json({
      success: true,
      count: parties.length,
      data: { parties },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerParty,
  updatePartyApproval,
  getElectionParties,
};
