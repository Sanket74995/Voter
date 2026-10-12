const { ethers } = require('ethers');

/**
 * Independent Election Verification Engine
 * Allows public observers, civil society, and auditors to verify
 * election integrity without privileged access or secrets.
 */
class IndependentVerifier {
  /**
   * Verify an election public record
   */
  static verifyElectionRecord(publicRecord) {
    const report = {
      timestamp: new Date().toISOString(),
      electionId: publicRecord.election?.electionId,
      title: publicRecord.election?.title,
      checks: {},
      isVerified: false,
      summary: '',
    };

    // Check 1: Election state is PUBLISHED
    const isPublished = publicRecord.election?.status === 'PUBLISHED';
    report.checks.electionStatePublished = {
      passed: isPublished,
      details: `Status is ${publicRecord.election?.status}`,
    };

    // Check 2: Credential root is non-zero
    const hasValidRoot =
      publicRecord.election?.credentialRoot &&
      publicRecord.election.credentialRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    report.checks.validCredentialRoot = {
      passed: !!hasValidRoot,
      credentialRoot: publicRecord.election?.credentialRoot,
    };

    // Check 3: Nullifier deduplication (no double-counting on-chain)
    const onChainBallots = publicRecord.onChainBallots || [];
    const nullifierSet = new Set();
    let hasDuplicateNullifier = false;

    for (const ballot of onChainBallots) {
      if (nullifierSet.has(ballot.nullifier)) {
        hasDuplicateNullifier = true;
        break;
      }
      nullifierSet.add(ballot.nullifier);
    }

    report.checks.nullifierDeduplication = {
      passed: !hasDuplicateNullifier,
      totalBallots: onChainBallots.length,
      uniqueNullifiers: nullifierSet.size,
    };

    // Check 4: Tally count reconciliation
    const tallyResult = publicRecord.tallyResult;
    const candidateVotes = tallyResult?.candidateVotes || [];
    const totalCounted = candidateVotes.reduce((sum, v) => sum + v, 0);

    const countsMatch = totalCounted === onChainBallots.length;
    report.checks.tallyCountReconciliation = {
      passed: countsMatch,
      ballotsRecordedOnChain: onChainBallots.length,
      candidateVotesSummed: totalCounted,
    };

    // Check 5: Tally commitment validity: Hash(candidateVotes, credentialRoot)
    let commitmentValid = false;
    if (tallyResult?.tallyCommitment && hasValidRoot) {
      try {
        const expectedCommitment = ethers.solidityPackedKeccak256(
          ['uint256[]', 'bytes32'],
          [candidateVotes, publicRecord.election.credentialRoot]
        );
        commitmentValid =
          expectedCommitment.toLowerCase() === tallyResult.tallyCommitment.toLowerCase();
      } catch (err) {
        commitmentValid = false;
      }
    }

    report.checks.tallyCommitmentIntegrity = {
      passed: commitmentValid,
      publishedCommitment: tallyResult?.tallyCommitment,
    };

    // Check 6: Trustee proof reference exists
    const hasTrusteeProof = !!tallyResult?.trusteeProofReference;
    report.checks.trusteeProofAvailable = {
      passed: hasTrusteeProof,
      trusteeProofReference: tallyResult?.trusteeProofReference,
    };

    // Overall verdict
    report.isVerified =
      report.checks.electionStatePublished.passed &&
      report.checks.validCredentialRoot.passed &&
      report.checks.nullifierDeduplication.passed &&
      report.checks.tallyCountReconciliation.passed &&
      report.checks.tallyCommitmentIntegrity.passed &&
      report.checks.trusteeProofAvailable.passed;

    report.summary = report.isVerified
      ? 'SUCCESS: Election tally and cryptographic artifacts independently verified.'
      : 'FAILED: One or more election verification checks failed.';

    return report;
  }
}

// Standalone CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  console.log('--- INDEPENDENT ELECTION RESULT VERIFIER CLI ---');
  console.log('Run automated audit against public election artifacts.');
  console.log('Usage: node verifier/src/index.js <public_record.json>');
}

module.exports = { IndependentVerifier };
