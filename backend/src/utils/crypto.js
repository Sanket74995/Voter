const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Hash a plain password using bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare plain password against stored hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a cryptographically secure random 32-byte credential secret key
 */
const generateCredentialSecret = () => {
  return '0x' + crypto.randomBytes(32).toString('hex');
};

/**
 * Compute voter credential commitment: C = Hash(secretKey, salt)
 */
const computeCommitment = (secretKey, salt) => {
  return ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [secretKey, salt]);
};

/**
 * Compute election-specific nullifier: Nullifier = Hash(secretKey, electionId)
 * Ensures nullifier is deterministic per (voter, election) but uncorrelated across elections.
 */
const computeNullifier = (secretKey, onChainElectionId) => {
  return ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256'],
    [secretKey, BigInt(onChainElectionId)]
  );
};

/**
 * In-memory Merkle Tree for credential commitments
 */
class CredentialMerkleTree {
  constructor(leaves = []) {
    this.leaves = leaves.map((l) => (l.startsWith('0x') ? l : '0x' + l));
    this.tree = [];
    this.buildTree();
  }

  hashPair(a, b) {
    if (!b) return a;
    // Lexicographical ordering for deterministic Merkle tree
    const [left, right] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
    return ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [left, right]);
  }

  buildTree() {
    if (this.leaves.length === 0) {
      this.tree = [['0x' + '0'.repeat(64)]];
      return;
    }

    let currentLevel = [...this.leaves];
    this.tree = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hashPair(currentLevel[i], currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }
  }

  getRoot() {
    if (!this.tree || this.tree.length === 0 || !this.tree[this.tree.length - 1][0]) {
      return '0x' + '0'.repeat(64);
    }
    return this.tree[this.tree.length - 1][0];
  }

  getProof(leaf) {
    const formattedLeaf = leaf.startsWith('0x') ? leaf : '0x' + leaf;
    let index = this.leaves.indexOf(formattedLeaf);
    if (index === -1) {
      throw new Error('Leaf not found in Merkle tree');
    }

    const proof = [];
    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const isRight = index % 2 === 1;
      const siblingIndex = isRight ? index - 1 : index + 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyProof(leaf, proof, root) {
    let hash = leaf.startsWith('0x') ? leaf : '0x' + leaf;
    for (const sibling of proof) {
      const [left, right] = BigInt(hash) < BigInt(sibling) ? [hash, sibling] : [sibling, hash];
      hash = ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [left, right]);
    }
    return hash.toLowerCase() === root.toLowerCase();
  }
}

/**
 * Ballot Encryption Utilities:
 * ECIES Hybrid Encryption over secp256k1:
 * 1. Generates ephemeral keypair
 * 2. Derives shared secret with electionPublicKey via ECDH
 * 3. Derives AES-256 key via HKDF-SHA256
 * 4. Encrypts payload with AES-256-GCM (12-byte random IV, 16-byte auth tag)
 * 5. Returns packaged envelope and verifiable commitment
 */
const encryptBallot = (candidateIndex, electionPublicKey, blindingFactor = null) => {
  const blinding = blindingFactor || crypto.randomBytes(32).toString('hex');
  
  // Format payload
  const payload = JSON.stringify({
    candidateIndex,
    blinding,
    timestamp: Date.now(),
  });

  // Ephemeral keypair
  const ephemeralWallet = ethers.Wallet.createRandom();
  const ephemeralPublicKey = ephemeralWallet.signingKey.publicKey;
  const ephemeralPrivateKey = ephemeralWallet.privateKey;

  // ECDH Shared Secret
  const sharedSecretHex = new ethers.SigningKey(ephemeralPrivateKey).computeSharedSecret(electionPublicKey);
  const sharedSecretBuf = Buffer.from(sharedSecretHex.replace(/^0x/, ''), 'hex');

  // HKDF-SHA256 key derivation
  const salt = Buffer.alloc(0);
  const info = Buffer.from('voter-ballot-ecies-v1', 'utf8');
  const aesKey = Buffer.from(crypto.hkdfSync('sha256', sharedSecretBuf, salt, info, 32));

  // AES-256-GCM authenticated encryption
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  let ciphertext = cipher.update(payload, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const envelope = {
    version: 'ecies-secp256k1-aes256gcm-v1',
    ephemeralPublicKey,
    iv: iv.toString('hex'),
    ciphertext,
    tag,
  };

  const encryptedBallotHex = '0x' + Buffer.from(JSON.stringify(envelope), 'utf8').toString('hex');

  // Deterministic ballot commitment: Hash(candidateIndex, Hash(blinding))
  const ballotCommitment = ethers.solidityPackedKeccak256(
    ['uint256', 'bytes32'],
    [candidateIndex, '0x' + crypto.createHash('sha256').update(blinding).digest('hex')]
  );

  return {
    encryptedBallot: encryptedBallotHex,
    ballotCommitment,
    blinding,
  };
};

/**
 * Decrypt ballot with election private key via ECDH + HKDF + AES-256-GCM
 */
const decryptBallot = (encryptedBallotHex, electionPrivateKey) => {
  if (!encryptedBallotHex || typeof encryptedBallotHex !== 'string') {
    throw new Error('Invalid encrypted ballot hex string');
  }

  const cleanHex = encryptedBallotHex.replace(/^0x/, '');
  if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
    throw new Error('Encrypted ballot contains non-hexadecimal characters');
  }

  const rawJson = Buffer.from(cleanHex, 'hex').toString('utf8');
  let envelope;
  try {
    envelope = JSON.parse(rawJson);
  } catch (err) {
    throw new Error('Failed to parse ballot envelope JSON structure: ' + err.message);
  }

  // Handle direct payload from mobile devices
  if (typeof envelope.candidateIndex === 'number') {
    return envelope;
  }

  const { ephemeralPublicKey, iv, ciphertext, tag } = envelope;
  if (!ephemeralPublicKey || !iv || !ciphertext || !tag) {
    throw new Error('Ballot envelope missing required cryptographic parameters (ephemeralPublicKey, iv, ciphertext, tag)');
  }

  if (!electionPrivateKey) {
    throw new Error('Election private key is required to decrypt ECIES ballot envelope');
  }

  // Derive shared secret
  const sharedSecretHex = new ethers.SigningKey(electionPrivateKey).computeSharedSecret(ephemeralPublicKey);
  const sharedSecretBuf = Buffer.from(sharedSecretHex.replace(/^0x/, ''), 'hex');

  // HKDF-SHA256 key derivation
  const salt = Buffer.alloc(0);
  const info = Buffer.from('voter-ballot-ecies-v1', 'utf8');
  const aesKey = Buffer.from(crypto.hkdfSync('sha256', sharedSecretBuf, salt, info, 32));

  // AES-256-GCM decryption and authentication
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateCredentialSecret,
  computeCommitment,
  computeNullifier,
  CredentialMerkleTree,
  encryptBallot,
  decryptBallot,
};
