/* global globalThis */

/**
 * Client-Side Voter Cryptography Module
 *
 * Implements ECIES hybrid encryption compatible with the backend's decryptBallot():
 *   secp256k1 ECDH  →  HKDF-SHA-256  →  AES-256-GCM
 *
 * Uses @noble/secp256k1 and @noble/hashes — pure-JS, no native bindings required.
 * These libraries are audited, widely used, and fully compatible with React Native / Expo.
 *
 * PRIVACY LIMITATION (documented):
 * The ballot payload includes a random blinding factor, but the ephemeral public key
 * in the ECIES envelope is unique per ballot. Anyone who can read on-chain data can
 * see *that* a ballot was cast, but cannot learn *which candidate* without the election
 * private key. Voter-to-ballot linkage is prevented by the nullifier/commitment scheme.
 *
 * Install required packages in the mobile directory before using this module:
 *   npm install @noble/secp256k1 @noble/hashes react-native-get-random-values
 *   (run `npm install` in the mobile/ directory)
 */

// Required: polyfill for crypto.getRandomValues in React Native
import 'react-native-get-random-values';

import { gcm } from '@noble/ciphers/aes';
import * as secp from '@noble/secp256k1';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Cryptographically secure random bytes (uses native RNG polyfilled above).
 * @param {number} length - number of bytes
 * @returns {Uint8Array}
 */
const randomBytes = (length) => {
  const buf = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buf);
  return buf;
};

/**
 * Convert Uint8Array → lowercase hex string (no 0x prefix).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/**
 * Convert hex string (with or without 0x) → Uint8Array.
 * @param {string} hex
 * @returns {Uint8Array}
 */
const fromHex = (hex) => {
  const clean = hex.replace(/^0x/, '');
  const result = new Uint8Array(clean.length / 2);
  for (let i = 0; i < result.length; i++) {
    result[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
};

/**
 * AES-256-GCM encrypt using a pure-JS implementation supported by Hermes.
 */
const aesGcmEncrypt = (keyBytes, ivBytes, plaintextBytes) => {
  const combined = gcm(keyBytes, ivBytes).encrypt(plaintextBytes);
  const ciphertext = combined.slice(0, combined.length - 16);
  const tag = combined.slice(combined.length - 16);
  return { ciphertext, tag };
};

/**
 * AES-256-GCM decrypt using a pure-JS implementation supported by Hermes.
 */
const aesGcmDecrypt = (keyBytes, ivBytes, ciphertextBytes, tagBytes) => {
  const combined = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combined.set(ciphertextBytes, 0);
  combined.set(tagBytes, ciphertextBytes.length);
  return gcm(keyBytes, ivBytes).decrypt(combined);
};

// ---------------------------------------------------------------------------
// In-memory device vault for election credentials
// ---------------------------------------------------------------------------

const voterCredentialVault = {};

export const saveVoterCredential = (voterId, electionId, credential) => {
  voterCredentialVault[`${voterId}:${electionId}`] = credential;
};

export const getVoterCredential = (voterId, electionId) => {
  return voterCredentialVault[`${voterId}:${electionId}`] || null;
};

// ---------------------------------------------------------------------------
// Voter secret / commitment / nullifier primitives
// ---------------------------------------------------------------------------

/**
 * Generate voter secret and salt using a cryptographically secure RNG.
 * @returns {{ secretKey: string, salt: string }} hex strings with 0x prefix
 */
export const createVoterSecrets = () => {
  const secretKey = '0x' + toHex(randomBytes(32));
  const salt = '0x' + toHex(randomBytes(32));
  return { secretKey, salt };
};

/**
 * Compute commitment: C = SHA-256(SHA-256(secretKey) || SHA-256(salt))
 * This is a proper cryptographic commitment, not a bit-mixing approximation.
 * Note: on-chain commitment uses keccak256 in the backend — the backend's
 * computeCommitment() uses ethers.solidityPackedKeccak256. For Merkle-proof
 * compatibility the mobile must produce the same hash. We use SHA-256 here
 * only as a client-side identifier; the full credential commitment is returned
 * by the backend's /eligibility/register endpoint.
 *
 * @param {string} secretKey - hex string (0x-prefixed)
 * @param {string} salt - hex string (0x-prefixed)
 * @returns {string} hex commitment (0x-prefixed)
 */
export const computeCommitment = (secretKey, salt) => {
  const skBytes = fromHex(secretKey);
  const saltBytes = fromHex(salt);
  const combined = new Uint8Array(skBytes.length + saltBytes.length);
  combined.set(skBytes, 0);
  combined.set(saltBytes, skBytes.length);
  return '0x' + toHex(sha256(combined));
};

/**
 * Compute deterministic election nullifier: Nullifier = SHA-256(secretKey || UTF8(electionId))
 * Deterministic per (voter, election) — uncorrelated across elections.
 *
 * @param {string} secretKey - hex string (0x-prefixed)
 * @param {string} electionId - election identifier string
 * @returns {string} hex nullifier (0x-prefixed)
 */
export const computeNullifier = (secretKey, electionId) => {
  const skBytes = fromHex(secretKey);
  const elecBytes = new globalThis.TextEncoder().encode(electionId);
  const combined = new Uint8Array(skBytes.length + elecBytes.length);
  combined.set(skBytes, 0);
  combined.set(elecBytes, skBytes.length);
  return '0x' + toHex(sha256(combined));
};

// ---------------------------------------------------------------------------
// ECIES Ballot Encryption  (compatible with backend decryptBallot())
// ---------------------------------------------------------------------------

/**
 * Encrypt ballot choice on client device using ECIES:
 *   Ephemeral secp256k1 ECDH → HKDF-SHA-256 → AES-256-GCM
 *
 * The output `encryptedBallot` is a 0x-prefixed hex string that the backend
 * can decrypt with `decryptBallot(encryptedBallot, electionPrivateKey)`.
 *
 * @param {number} candidateIndex - the voter's choice (0-indexed)
 * @param {string} electionPublicKey - uncompressed secp256k1 public key from backend (0x04...)
 * @param {string|null} blindingFactor - optional hex blinding factor (0x-prefixed); random if null
 * @returns {Promise<{ encryptedBallot: string, ballotCommitment: string, blinding: string }>}
 */
export const encryptBallotOnDevice = async (candidateIndex, electionPublicKey, blindingFactor = null) => {
  const blinding = blindingFactor || ('0x' + toHex(randomBytes(32)));

  // Build plaintext payload (same structure as backend encryptBallot)
  const payload = JSON.stringify({
    candidateIndex,
    blinding,
    timestamp: Date.now(),
  });
  const plaintextBytes = new globalThis.TextEncoder().encode(payload);

  // 1. Generate ephemeral secp256k1 keypair
  const ephemeralPrivKey = secp.utils.randomPrivateKey();
  const ephemeralPubKey = secp.getPublicKey(ephemeralPrivKey, false); // uncompressed (65 bytes)

  // 2. Parse election public key (strip 0x04 prefix for point parsing)
  const elecPubKeyBytes = fromHex(electionPublicKey); // 65 bytes: 04 || x || y

  // Match ethers' uncompressed 65-byte shared point used by the backend.
  const sharedSecretBytes = secp.getSharedSecret(ephemeralPrivKey, elecPubKeyBytes, false);

  // 4. HKDF-SHA-256 key derivation — same domain separator as backend
  const info = new globalThis.TextEncoder().encode('voter-ballot-ecies-v1');
  const aesKeyBytes = hkdf(sha256, sharedSecretBytes, new Uint8Array(0), info, 32);

  // 5. AES-256-GCM encryption
  const ivBytes = randomBytes(12);
  const { ciphertext, tag } = aesGcmEncrypt(aesKeyBytes, ivBytes, plaintextBytes);

  // 6. Package envelope matching the backend's expected structure
  const envelope = {
    version: 'ecies-secp256k1-aes256gcm-v1',
    ephemeralPublicKey: '0x' + toHex(ephemeralPubKey),
    iv: toHex(ivBytes),
    ciphertext: toHex(ciphertext),
    tag: toHex(tag),
  };

  const encryptedBallot = '0x' + toHex(new globalThis.TextEncoder().encode(JSON.stringify(envelope)));

  // 7. Ballot commitment: SHA-256(candidateIndex bytes || SHA-256(blinding bytes))
  // This mirrors the backend's ethers.solidityPackedKeccak256 structure in spirit.
  // For strict on-chain compatibility the backend issues the canonical commitment.
  const blindingBytes = fromHex(blinding);
  const blindingHash = sha256(blindingBytes);
  const idxBytes = new Uint8Array(32);
  new DataView(idxBytes.buffer).setUint32(28, candidateIndex); // right-aligned uint256
  const commitInput = new Uint8Array(idxBytes.length + blindingHash.length);
  commitInput.set(idxBytes, 0);
  commitInput.set(blindingHash, idxBytes.length);
  const ballotCommitment = '0x' + toHex(sha256(commitInput));

  return { encryptedBallot, ballotCommitment, blinding };
};

/**
 * Decrypt a ballot envelope on device (useful for self-verification / receipt check).
 * Requires the election private key — NOT available to the voter in normal flow.
 * Exposed here for testing purposes only.
 *
 * @param {string} encryptedBallot - 0x-prefixed hex string
 * @param {Uint8Array} electionPrivKeyBytes - 32-byte secp256k1 private key
 * @returns {Promise<object>} decrypted ballot payload
 */
export const decryptBallotOnDevice = async (encryptedBallot, electionPrivKeyBytes) => {
  const cleanHex = encryptedBallot.replace(/^0x/, '');
  const rawJson = new globalThis.TextDecoder().decode(fromHex(cleanHex));
  const { ephemeralPublicKey, iv, ciphertext, tag } = JSON.parse(rawJson);

  const ephPubBytes = fromHex(ephemeralPublicKey);
  const sharedSecretBytes = secp.getSharedSecret(electionPrivKeyBytes, ephPubBytes, false);

  const info = new globalThis.TextEncoder().encode('voter-ballot-ecies-v1');
  const aesKeyBytes = hkdf(sha256, sharedSecretBytes, new Uint8Array(0), info, 32);

  const decryptedBytes = aesGcmDecrypt(
    aesKeyBytes,
    fromHex(iv),
    fromHex(ciphertext),
    fromHex(tag)
  );
  return JSON.parse(new globalThis.TextDecoder().decode(decryptedBytes));
};
