import * as secp from '@noble/secp256k1';
import {
  decryptBallotOnDevice,
  encryptBallotOnDevice,
  getVoterCredential,
  saveVoterCredential,
} from '../src/crypto/voterCrypto';

describe('voter ballot encryption', () => {
  it('keeps credentials isolated between voter accounts on the same device', () => {
    const electionId = 'ELECTION-CREDENTIAL-ISOLATION';
    const aaravCredential = { secretKey: 'aarav-secret' };
    const diyaCredential = { secretKey: 'diya-secret' };

    saveVoterCredential('VOTER-2026-101', electionId, aaravCredential);
    saveVoterCredential('VOTER-2026-102', electionId, diyaCredential);

    expect(getVoterCredential('VOTER-2026-101', electionId)).toBe(aaravCredential);
    expect(getVoterCredential('VOTER-2026-102', electionId)).toBe(diyaCredential);
  });

  it('encrypts and decrypts ballots with Hermes-compatible crypto', async () => {
    const electionPrivateKey = secp.utils.randomPrivateKey();
    const electionPublicKey = `0x${Array.from(secp.getPublicKey(electionPrivateKey, false))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')}`;

    const { encryptedBallot, ballotCommitment } = await encryptBallotOnDevice(
      2,
      electionPublicKey
    );
    const decrypted = await decryptBallotOnDevice(encryptedBallot, electionPrivateKey);

    expect(encryptedBallot).toMatch(/^0x[0-9a-f]+$/);
    expect(ballotCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(decrypted.candidateIndex).toBe(2);
  });
});
