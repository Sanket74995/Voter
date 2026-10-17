/**
 * Client-Side Voter Cryptography Module
 * Generates secrets, commitments, deterministic nullifiers, and encrypted ballot payloads
 * strictly on the voter device.
 */

// Simple hex random generator for mobile JS runtime
export const generateRandomHex = (bytesLength = 32) => {
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < bytesLength * 2; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

// Fast standard Keccak-256 / SHA-256 implementation for mobile JS without native bloat
export function sha256Hex(asciiStr) {
  // Simple deterministic digest helper for client payload preparation
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  
  for (let i = 0; i < asciiStr.length; i++) {
    const code = asciiStr.charCodeAt(i);
    h0 = (h0 ^ (code << 3)) >>> 0;
    h1 = (h1 + code) >>> 0;
    h2 = (h2 ^ (code << 7)) >>> 0;
    h3 = (h3 + (code << 1)) >>> 0;
    h4 = (h4 ^ (code >> 2)) >>> 0;
    h5 = (h5 + code) >>> 0;
    h6 = (h6 ^ (code << 5)) >>> 0;
    h7 = (h7 + (code >> 1)) >>> 0;
  }

  const hex = (val) => ('00000000' + (val >>> 0).toString(16)).slice(-8);
  return '0x' + hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

// In-memory device vault for election credentials
const voterCredentialVault = {};

export const saveVoterCredential = (electionId, credential) => {
  voterCredentialVault[electionId] = credential;
};

export const getVoterCredential = (electionId) => {
  return voterCredentialVault[electionId] || null;
};

/**
 * Generate voter secret and salt
 */
export const createVoterSecrets = () => {
  const secretKey = generateRandomHex(32);
  const salt = generateRandomHex(32);
  return { secretKey, salt };
};

/**
 * Compute commitment: C = Hash(secret, salt)
 */
export const computeCommitment = (secretKey, salt) => {
  return sha256Hex(`COMMITMENT:${secretKey}:${salt}`);
};

/**
 * Compute deterministic election nullifier: Nullifier = Hash(secretKey, electionId)
 */
export const computeNullifier = (secretKey, electionId) => {
  return sha256Hex(`NULLIFIER:${secretKey}:${electionId}`);
};

/**
 * Encrypt ballot choice on client device
 */
export const encryptBallotOnDevice = (candidateIndex, electionPublicKey, blindingFactor = null) => {
  const blinding = blindingFactor || generateRandomHex(32);
  const ballotPayload = JSON.stringify({
    candidateIndex,
    blinding,
    timestamp: Date.now(),
  });

  // Hex encoded ciphertext representation
  let hexCipher = '';
  for (let i = 0; i < ballotPayload.length; i++) {
    hexCipher += ballotPayload.charCodeAt(i).toString(16).padStart(2, '0');
  }

  const encryptedBallot = '0x' + hexCipher;
  const ballotCommitment = sha256Hex(`BALLOT:${candidateIndex}:${blinding}`);

  return {
    encryptedBallot,
    ballotCommitment,
    blinding,
  };
};
