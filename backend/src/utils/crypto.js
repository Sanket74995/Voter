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
 * Uses AES-256-GCM encrypted payload with an election-specific public key encapsulation,
 * plus a verifiable ballot hash commitment.
 */
const encryptBallot = (candidateIndex, electionPublicKey, blindingFactor = null) => {
  const nonce = crypto.randomBytes(12);
  const blinding = blindingFactor || crypto.randomBytes(32).toString('hex');
  
  // Create payload
  const payload = JSON.stringify({
    candidateIndex,
    blinding,
    timestamp: Date.now(),
  });

  // Derive key from electionPublicKey (ECDH or shared election key)
  const key = crypto.createHash('sha256').update(electionPublicKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const encryptedBallotHex = '0x' + Buffer.from(JSON.stringify({
    iv: nonce.toString('hex'),
    ciphertext: encrypted,
    tag: authTag,
  })).toString('hex');

  // Compute deterministic ballot commitment
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
 * Decrypt ballot (authorized during tally phase with election private key)
 */
const decryptBallot = (encryptedBallotHex, electionPrivateKey) => {
  const rawJson = Buffer.from(encryptedBallotHex.replace(/^0x/, ''), 'hex').toString('utf8');
  const { iv, ciphertext, tag } = JSON.parse(rawJson);
  
  const key = crypto.createHash('sha256').update(electionPrivateKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
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
