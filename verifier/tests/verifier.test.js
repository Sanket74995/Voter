const { IndependentVerifier } = require('../src/index');
const { ethers } = require('ethers');

describe('Independent Verifier CLI Test Suite', () => {
  const electionId = 'ELEC-TEST-001';
  const credentialRoot = ethers.keccak256(ethers.toUtf8Bytes('credential_root_sample'));
  const candidateVotes = [120, 85];
  const tallyCommitment = ethers.solidityPackedKeccak256(
    ['uint256[]', 'bytes32'],
    [candidateVotes, credentialRoot]
  );

  const mockValidRecord = {
    election: {
      electionId,
      title: 'General Election 2026',
      status: 'PUBLISHED',
      credentialRoot,
    },
    candidates: [
      { candidateIndex: 0, name: 'Party Blue' },
      { candidateIndex: 1, name: 'Party Red' },
    ],
    onChainBallots: Array.from({ length: 205 }, (_, i) => ({
      index: i,
      nullifier: ethers.keccak256(ethers.toUtf8Bytes(`nullifier_${i}`)),
      ballotCommitment: ethers.keccak256(ethers.toUtf8Bytes(`ballot_${i}`)),
    })),
    tallyResult: {
      tallyCommitment,
      candidateVotes,
      totalBallots: 205,
      trusteeProofReference: 'ipfs://QmProofHashSample',
    },
  };

  it('should independently verify a valid election artifact', () => {
    const report = IndependentVerifier.verifyElectionRecord(mockValidRecord);
    expect(report.isVerified).toBe(true);
    expect(report.checks.electionStatePublished.passed).toBe(true);
    expect(report.checks.nullifierDeduplication.passed).toBe(true);
    expect(report.checks.tallyCountReconciliation.passed).toBe(true);
    expect(report.checks.tallyCommitmentIntegrity.passed).toBe(true);
  });

  it('should reject when duplicate nullifier is detected (double-voting attempt)', () => {
    const invalidRecord = JSON.parse(JSON.stringify(mockValidRecord));
    // Inject duplicate nullifier
    invalidRecord.onChainBallots[1].nullifier = invalidRecord.onChainBallots[0].nullifier;

    const report = IndependentVerifier.verifyElectionRecord(invalidRecord);
    expect(report.isVerified).toBe(false);
    expect(report.checks.nullifierDeduplication.passed).toBe(false);
  });

  it('should reject when tally counts do not match on-chain ballots', () => {
    const invalidRecord = JSON.parse(JSON.stringify(mockValidRecord));
    invalidRecord.tallyResult.candidateVotes = [120, 90]; // 210 != 205

    const report = IndependentVerifier.verifyElectionRecord(invalidRecord);
    expect(report.isVerified).toBe(false);
    expect(report.checks.tallyCountReconciliation.passed).toBe(false);
  });

  it('should reject when tally commitment is forged', () => {
    const invalidRecord = JSON.parse(JSON.stringify(mockValidRecord));
    invalidRecord.tallyResult.tallyCommitment = ethers.keccak256(ethers.toUtf8Bytes('forged'));

    const report = IndependentVerifier.verifyElectionRecord(invalidRecord);
    expect(report.isVerified).toBe(false);
    expect(report.checks.tallyCommitmentIntegrity.passed).toBe(false);
  });
});
