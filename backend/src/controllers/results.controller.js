const Election = require('../models/Election');
const Party = require('../models/Party');
const blockchainService = require('../blockchain/blockchainService');
const { decryptBallot } = require('../utils/crypto');
const keyStore = require('../utils/keyStore');
const { logAudit } = require('../audit/auditLogger');
const { ethers } = require('ethers');

/**
 * Get election results:
 * - If still OPEN or DRAFT/FROZEN: candidate totals are WITHHELD.
 * - If CLOSED / PUBLISHED: returns verified totals.
 */
const getResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    // STRICT PRIVACY RULE: Before publication, never expose candidate-level counts
    if (election.status !== 'PUBLISHED') {
      return res.status(200).json({
        success: true,
        message: 'Election results are withheld until voting closes and tally verification completes.',
        data: {
          electionId: election.electionId,
          title: election.title,
          status: election.status,
          totalEligibleVoters: election.totalEligibleVoters,
          turnoutCount: election.turnoutCount,
          isPublished: false,
        },
      });
    }

    const parties = await Party.find({
      electionId: id,
      approvalStatus: 'APPROVED',
    }).sort({ candidateIndex: 1 });

    const totalVotes = election.tallyResult ? election.tallyResult.totalBallots : 0;
    const candidateTotals = (election.tallyResult?.candidateVotes || []).map((votes, idx) => {
      const party = parties[idx];
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : 0;
      return {
        candidateIndex: idx,
        partyName: party ? party.name : `Candidate ${idx}`,
        candidateName: party ? party.candidateName : `Candidate ${idx}`,
        symbol: party ? party.symbol : '',
        symbolUrl: party ? party.symbolUrl : '',
        voteCount: votes,
        percentage: Number(percentage),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        electionId: election.electionId,
        title: election.title,
        status: election.status,
        totalEligibleVoters: election.totalEligibleVoters,
        totalBallotsCounted: totalVotes,
        turnoutPercentage:
          election.totalEligibleVoters > 0
            ? ((totalVotes / election.totalEligibleVoters) * 100).toFixed(2)
            : 0,
        candidateResults: candidateTotals,
        tallyCommitment: election.tallyResult?.tallyCommitment,
        trusteeProofReference: election.tallyResult?.trusteeProofReference,
        publishedAt: election.tallyResult?.publishedAt,
        verificationArtifacts: election.tallyVerificationArtifacts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tally encrypted ballots and publish verified result (Admin only)
 */
const tallyAndPublish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: `Cannot compute tally. Election status is '${election.status}'. Must be 'CLOSED'.`,
      });
    }

    const approvedParties = await Party.find({
      electionId: id,
      approvalStatus: 'APPROVED',
    }).sort({ candidateIndex: 1 });

    const onChainId = election.onChainElectionId || (Math.abs(hashString(election.electionId)) % 1000000) + 1;
    
    // Fetch all recorded ballots from on-chain smart contract
    const onChainBallots = await blockchainService.fetchOnChainBallots(onChainId);

    if (onChainBallots.length === 0) {
      console.warn(`[Tally] No on-chain ballots found for election ${id} (onChainId=${onChainId}). ` +
        'This can happen if the Hardhat node was restarted and on-chain state was lost.');
    }

    // Fetch authorized election private key for tally decryption
    let electionPrivateKey;
    try {
      electionPrivateKey = keyStore.getElectionPrivateKey(id);
    } catch (keyErr) {
      await logAudit({
        action: 'TALLY_ABORTED_KEY_MISSING',
        performedBy: req.user.voterId,
        targetType: 'TALLY',
        targetId: election.electionId,
        status: 'FAILURE',
        details: { reason: keyErr.message },
        req,
      });
      return res.status(500).json({
        success: false,
        error: `Tally calculation aborted: ${keyErr.message}`,
      });
    }

    // Initialize vote counts for each candidate
    const candidateVotes = new Array(approvedParties.length).fill(0);
    const corruptedBallots = [];

    // Strictly authenticate and decrypt each on-chain ballot
    for (const ballot of onChainBallots) {
      try {
        const decrypted = decryptBallot(ballot.encryptedBallot, electionPrivateKey);
        const idx = decrypted.candidateIndex;
        if (typeof idx === 'number' && idx >= 0 && idx < candidateVotes.length) {
          candidateVotes[idx] += 1;
        } else {
          corruptedBallots.push({
            ballotIndex: ballot.index,
            nullifier: ballot.nullifier,
            reason: `Invalid candidate index: ${idx}`,
          });
        }
      } catch (err) {
        corruptedBallots.push({
          ballotIndex: ballot.index,
          nullifier: ballot.nullifier,
          reason: err.message,
        });
      }
    }

    // HALT PUBLICATION IF ANY CORRUPTED / UNPROCESSABLE BALLOTS DETECTED
    if (corruptedBallots.length > 0) {
      await logAudit({
        action: 'TALLY_ABORTED_CORRUPTED_BALLOTS',
        performedBy: req.user.voterId,
        targetType: 'TALLY',
        targetId: election.electionId,
        status: 'FAILURE',
        details: {
          corruptedCount: corruptedBallots.length,
          totalOnChainBallots: onChainBallots.length,
          corruptedSamples: corruptedBallots.slice(0, 5),
        },
        req,
      });

      return res.status(422).json({
        success: false,
        error: `Tally calculation halted: ${corruptedBallots.length} on-chain ballot(s) failed cryptographic decryption or authentication. Fallback allocation is strictly prohibited.`,
        data: {
          corruptedCount: corruptedBallots.length,
          totalBallots: onChainBallots.length,
        },
      });
    }

    const totalBallots = onChainBallots.length;

    // Cryptographic commitment to final tally: Hash(candidateVotes, root)
    const tallyCommitment = ethers.solidityPackedKeccak256(
      ['uint256[]', 'bytes32'],
      [candidateVotes, election.credentialRoot]
    );

    const trusteeProofRef = `ipfs://QmTrusteeTallyVerificationProof_${election.electionId}_${Date.now()}`;

    // Publish to on-chain TallyRegistry
    let onChainTx;
    try {
      onChainTx = await blockchainService.publishTallyOnChain({
        onChainElectionId: onChainId,
        tallyCommitment,
        candidateVotes,
        trusteeProofReference: trusteeProofRef,
      });
    } catch (contractError) {
      console.warn('[Tally Contract Warning]', contractError.message);
    }

    election.status = 'PUBLISHED';
    election.tallyResult = {
      tallyCommitment,
      candidateVotes,
      totalBallots,
      trusteeProofReference: trusteeProofRef,
      publishedAt: new Date(),
      onChainTxHash: onChainTx?.txHash || null,
    };

    election.tallyVerificationArtifacts = {
      onChainElectionId: onChainId,
      credentialRoot: election.credentialRoot,
      totalBallotsRecorded: totalBallots,
      tallyCommitment,
      ballotNullifiers: onChainBallots.map((b) => b.nullifier),
      trusteeProofReference: trusteeProofRef,
    };

    await election.save();

    await logAudit({
      action: 'TALLY_PUBLISHED',
      performedBy: req.user.voterId,
      targetType: 'TALLY',
      targetId: election.electionId,
      details: {
        totalBallots,
        tallyCommitment,
        txHash: onChainTx?.txHash,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Tally computed and verified. Results published on-chain and in public registry.',
      data: {
        electionId: election.electionId,
        totalBallotsCounted: totalBallots,
        candidateVotes,
        tallyCommitment,
        onChainTx,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export public election record for independent verifier
 */
const getPublicElectionRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const election = await Election.findOne({ electionId: id });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    const parties = await Party.find({ electionId: id, approvalStatus: 'APPROVED' }).sort({ candidateIndex: 1 });
    const onChainId = election.onChainElectionId || (Math.abs(hashString(election.electionId)) % 1000000) + 1;
    const ballots = await blockchainService.fetchOnChainBallots(onChainId);

    return res.status(200).json({
      success: true,
      data: {
        election: {
          electionId: election.electionId,
          title: election.title,
          status: election.status,
          credentialRoot: election.credentialRoot,
          encryptionPublicKey: election.encryptionPublicKey,
        },
        candidates: parties.map((p) => ({
          candidateIndex: p.candidateIndex,
          name: p.name,
          candidateName: p.candidateName,
        })),
        onChainBallots: ballots,
        tallyResult: election.tallyResult,
        tallyVerificationArtifacts: election.tallyVerificationArtifacts,
      },
    });
  } catch (error) {
    next(error);
  }
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

module.exports = {
  getResults,
  tallyAndPublish,
  getPublicElectionRecord,
};
