const { encryptBallot, decryptBallot } = require('../src/utils/crypto');
const keyStore = require('../src/utils/keyStore');
const { ethers } = require('ethers');

describe('Ballot Cryptography & Tally Security Tests', () => {
  let electionWallet;
  let electionPublicKey;
  let electionPrivateKey;

  beforeAll(() => {
    electionWallet = ethers.Wallet.createRandom();
    electionPublicKey = electionWallet.signingKey.publicKey;
    electionPrivateKey = electionWallet.privateKey;
  });

  describe('1. Valid Ballot Encryption & Decryption (ECIES secp256k1 + HKDF + AES-256-GCM)', () => {
    it('encrypts and decrypts ballot for candidate index 0', () => {
      const { encryptedBallot, ballotCommitment, blinding } = encryptBallot(0, electionPublicKey);
      expect(encryptedBallot).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(ballotCommitment).toBeDefined();

      const decrypted = decryptBallot(encryptedBallot, electionPrivateKey);
      expect(decrypted.candidateIndex).toBe(0);
      expect(decrypted.blinding).toBe(blinding);
    });

    it('encrypts and decrypts ballot for candidate index 1', () => {
      const { encryptedBallot, blinding } = encryptBallot(1, electionPublicKey);
      const decrypted = decryptBallot(encryptedBallot, electionPrivateKey);
      expect(decrypted.candidateIndex).toBe(1);
      expect(decrypted.blinding).toBe(blinding);
    });

    it('encrypts and decrypts ballot for candidate index 2', () => {
      const { encryptedBallot, blinding } = encryptBallot(2, electionPublicKey);
      const decrypted = decryptBallot(encryptedBallot, electionPrivateKey);
      expect(decrypted.candidateIndex).toBe(2);
      expect(decrypted.blinding).toBe(blinding);
    });
  });

  describe('2. Legacy Mobile Hex-Plaintext Rejection', () => {
    it('rejects raw hex-encoded plaintext JSON without ECIES envelope', () => {
      const rawPayload = JSON.stringify({
        candidateIndex: 2,
        blinding: '0x1234567890abcdef',
        timestamp: Date.now(),
      });
      const legacyMobileHex = '0x' + Buffer.from(rawPayload, 'utf8').toString('hex');

      expect(() => {
        decryptBallot(legacyMobileHex, electionPrivateKey);
      }).toThrow('missing required cryptographic parameters');
    });
  });

  describe('3. Malformed Payloads, Corrupted Ciphertext, and Tamper Detection', () => {
    it('rejects corrupted ciphertext with invalid auth tag', () => {
      const { encryptedBallot } = encryptBallot(1, electionPublicKey);
      const rawJsonStr = Buffer.from(encryptedBallot.replace(/^0x/, ''), 'hex').toString('utf8');
      const envelope = JSON.parse(rawJsonStr);

      // Corrupt the ciphertext
      envelope.ciphertext = envelope.ciphertext.replace(/^[0-9a-f]/, (c) => (c === 'a' ? 'b' : 'a'));
      const tamperedHex = '0x' + Buffer.from(JSON.stringify(envelope)).toString('hex');

      expect(() => {
        decryptBallot(tamperedHex, electionPrivateKey);
      }).toThrow();
    });

    it('rejects tampered auth tag', () => {
      const { encryptedBallot } = encryptBallot(1, electionPublicKey);
      const rawJsonStr = Buffer.from(encryptedBallot.replace(/^0x/, ''), 'hex').toString('utf8');
      const envelope = JSON.parse(rawJsonStr);

      envelope.tag = '00000000000000000000000000000000';
      const tamperedHex = '0x' + Buffer.from(JSON.stringify(envelope)).toString('hex');

      expect(() => {
        decryptBallot(tamperedHex, electionPrivateKey);
      }).toThrow();
    });

    it('rejects decryption with the wrong private key material', () => {
      const { encryptedBallot } = encryptBallot(1, electionPublicKey);
      const wrongWallet = ethers.Wallet.createRandom();

      expect(() => {
        decryptBallot(encryptedBallot, wrongWallet.privateKey);
      }).toThrow();
    });

    it('rejects invalid or non-hex string input', () => {
      expect(() => {
        decryptBallot('0xZZZZ', electionPrivateKey);
      }).toThrow('non-hexadecimal characters');
    });
  });

  describe('4. Tally Simulation: Zero Fallback to Candidate 0', () => {
    it('simulated tally rejects malformed or unauthenticated ballots without allocating to candidate 0', () => {
      const candidateVotes = [0, 0, 0];
      const corruptedBallots = [
        '0x' + Buffer.from(JSON.stringify({ candidateIndex: 2 })).toString('hex'), // raw unencrypted json
        '0x1234invalid',
      ];

      const rejectedBallots = [];

      for (const ballotHex of corruptedBallots) {
        try {
          const decrypted = decryptBallot(ballotHex, electionPrivateKey);
          candidateVotes[decrypted.candidateIndex]++;
        } catch (err) {
          rejectedBallots.push({ ballotHex, error: err.message });
          // CRITICAL: MUST NOT DO candidateVotes[0]++ !
        }
      }

      // Candidate 0 count MUST remain 0
      expect(candidateVotes[0]).toBe(0);
      expect(candidateVotes[1]).toBe(0);
      expect(candidateVotes[2]).toBe(0);
      expect(rejectedBallots.length).toBe(2);
    });
  });

  describe('5. KeyStore Integration', () => {
    it('stores and retrieves election private key in isolated vault without exposing in DB', () => {
      const testElectionId = 'ELEC-TEST-VAULT-001';
      const { electionPublicKey: pubKey } = keyStore.generateElectionKeyPair(testElectionId);

      expect(pubKey).toMatch(/^0x04[0-9a-fA-F]{128}$/);

      const retrievedPrivKey = keyStore.getElectionPrivateKey(testElectionId);
      expect(retrievedPrivKey).toMatch(/^0x[0-9a-fA-F]{64}$/);

      // Verify that the retrieved private key matches the generated public key
      const derivedPubKey = new ethers.SigningKey(retrievedPrivKey).publicKey;
      expect(derivedPubKey).toBe(pubKey);
    });
  });
});
