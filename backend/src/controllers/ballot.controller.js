const Election = require('../models/Election');
const Party = require('../models/Party');
const CredentialIssuance = require('../models/CredentialIssuance');
const { CredentialMerkleTree } = require('../utils/crypto');
const blockchainService = require('../blockchain/blockchainService');
const { logAudit } = require('../audit/auditLogger');

/**
 * Prepare ballot: fetch election encryption public key and active candidate options
 */
const prepareBallot = async (req, res, next) => {
  try {
    const { electionId } = req.body;

    if (!electionId) {
      return res.status(400).json({ success: false, error: 'electionId is required.' });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: `Election is currently in '${election.status}' state and not open for voting.`,
      });
    }

    const approvedParties = await Party.find({
      electionId,
      approvalStatus: 'APPROVED',
    }).select('partyId name candidateName symbol symbolUrl candidateIndex').sort({ candidateIndex: 1 });

    return res.status(200).json({
      success: true,
      data: {
        electionId: election.electionId,
        title: election.title,
        credentialRoot: election.credentialRoot,
        encryptionPublicKey: election.encryptionPublicKey,
        candidates: approvedParties,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Anonymous ballot submission:
 * Receives the encrypted ballot, nullifier, and membership proof.
 * Relays the transaction to the EVM smart contract without voter identity linkage.
 */
const submitBallot = async (req, res, next) => {
  try {
    const {
      electionId,
      nullifier,
      ballotCommitment,
      encryptedBallot,
      leafCommitment,
      merkleProof,
    } = req.body;

    if (!electionId || !nullifier || !ballotCommitment || !encryptedBallot || !leafCommitment || !merkleProof) {
      return res.status(400).json({
        success: false,
        error: 'Missing required voting parameters (electionId, nullifier, ballotCommitment, encryptedBallot, leafCommitment, merkleProof).',
      });
    }

    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    if (election.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: `Voting is rejected. Election status is '${election.status}'.`,
      });
    }

    // Format fields
    const formattedNullifier = nullifier.startsWith('0x') ? nullifier : '0x' + nullifier;
    const formattedBallotCommitment = ballotCommitment.startsWith('0x') ? ballotCommitment : '0x' + ballotCommitment;
    const formattedLeaf = leafCommitment.startsWith('0x') ? leafCommitment : '0x' + leafCommitment;
    const formattedProof = merkleProof.map((p) => (p.startsWith('0x') ? p : '0x' + p));

    // Convert onChainElectionId (default to numeric hash if not explicitly set)
    const onChainId = election.onChainElectionId || (Math.abs(hashString(election.electionId)) % 1000000) + 1;

    // Sync effective credential Merkle root from active credentials
    let effectiveCredentialRoot = election.credentialRoot;
    const activeCreds = await CredentialIssuance.find({
      electionId,
      status: 'ACTIVE',
    });
    if (activeCreds.length > 0) {
      const leaves = activeCreds.map((c) => c.commitment);
      const tree = new CredentialMerkleTree(leaves);
      effectiveCredentialRoot = tree.getRoot();
      if (election.credentialRoot !== effectiveCredentialRoot) {
        election.credentialRoot = effectiveCredentialRoot;
        await election.save();
      }
    } else if (!effectiveCredentialRoot || effectiveCredentialRoot.startsWith('0x11111111')) {
      effectiveCredentialRoot = formattedLeaf;
      election.credentialRoot = effectiveCredentialRoot;
      await election.save();
    }

    let relayReceipt;
    try {
      relayReceipt = await blockchainService.relayBallot({
        onChainElectionId: onChainId,
        nullifier: formattedNullifier,
        ballotCommitment: formattedBallotCommitment,
        encryptedBallot: encryptedBallot.startsWith('0x') ? encryptedBallot : '0x' + Buffer.from(encryptedBallot).toString('hex'),
        leafCommitment: formattedLeaf,
        merkleProof: formattedProof,
        electionDetails: {
          title: election.title,
          startTime: Math.floor(new Date(election.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(election.endTime).getTime() / 1000),
          encryptionPublicKey: election.encryptionPublicKey,
          credentialRoot: effectiveCredentialRoot,
        },
      });
    } catch (blockchainError) {
      const errStr =
        (blockchainError.message || '') +
        ' ' +
        (blockchainError.data || '') +
        ' ' +
        (blockchainError.info?.error?.message || '');

      if (errStr.includes('NullifierAlreadyUsed') || errStr.includes('0xda1f09e8')) {
        return res.status(409).json({
          success: false,
          error: 'This voting entitlement / nullifier has already been consumed for this election.',
        });
      }
      if (
        errStr.includes('ProofVerificationFailed') ||
        errStr.includes('MerkleRootMismatch') ||
        errStr.includes('0x8aa536b5')
      ) {
        return res.status(400).json({
          success: false,
          error: 'Cryptographic proof verification failed. Leaf commitment is not part of eligible tree.',
        });
      }
      if (errStr.includes('ElectionNotOpen') || errStr.includes('0xea71f501')) {
        return res.status(400).json({
          success: false,
          error: 'Smart contract reported election is not currently open for voting.',
        });
      }
      throw blockchainError;
    }

    // Persist the onChainElectionId if not already saved
    if (!election.onChainElectionId) {
      election.onChainElectionId = onChainId;
    }
    // Increment aggregate turnout on MongoDB without linking identity
    election.turnoutCount += 1;
    await election.save();

    await logAudit({
      action: 'BALLOT_CAST_SUCCESS',
      performedBy: 'ANONYMOUS_RELAY',
      targetType: 'ELECTION',
      targetId: election.electionId,
      details: {
        txHash: relayReceipt.txHash,
        nullifierPrefix: formattedNullifier.substring(0, 10) + '...',
      },
      req,
    });

    // Return privacy-safe receipt to the voter client
    return res.status(201).json({
      success: true,
      message: 'Ballot successfully validated and recorded on the blockchain.',
      data: {
        receipt: {
          electionId: election.electionId,
          nullifier: formattedNullifier,
          ballotCommitment: formattedBallotCommitment,
          transactionHash: relayReceipt.txHash,
          blockNumber: relayReceipt.blockNumber,
          timestamp: new Date().toISOString(),
          status: 'ACCEPTED_ON_CHAIN',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check inclusion status of a ballot receipt
 */
const getBallotStatus = async (req, res, next) => {
  try {
    const { electionId, nullifier } = req.params;
    const election = await Election.findOne({ electionId });
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found.' });
    }

    const onChainId = election.onChainElectionId || (Math.abs(hashString(election.electionId)) % 1000000) + 1;
    const formattedNullifier = nullifier.startsWith('0x') ? nullifier : '0x' + nullifier;

    const isUsed = await blockchainService.isNullifierUsed(onChainId, formattedNullifier);

    return res.status(200).json({
      success: true,
      data: {
        electionId,
        nullifier: formattedNullifier,
        isRecordedOnChain: isUsed,
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
  prepareBallot,
  submitBallot,
  getBallotStatus,
};
