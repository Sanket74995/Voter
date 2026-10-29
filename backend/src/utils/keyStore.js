const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');

/**
 * KeyStoreService
 * Abstracted Key Management Service for election cryptographic keys.
 *
 * In Production:
 * Must integrate with an enterprise HSM / KMS (AWS KMS, GCP Cloud KMS, HashiCorp Vault)
 * where election private keys are protected under strict hardware security policies and
 * accessible only via authorized quorum during the tally phase.
 *
 * In Local Development:
 * Uses a dedicated, process-restricted encrypted keystore stored in a protected vault directory,
 * encrypted under a separate KEY_VAULT_SECRET rather than being stored in plaintext in the DB.
 *
 * Master key derivation: PBKDF2-SHA-256, 200 000 iterations, 16-byte random per-vault salt.
 * This makes offline dictionary attacks against a stolen vault file computationally expensive.
 */
class KeyStoreService {
  constructor() {
    this.vaultDir = path.resolve(__dirname, '../../vault');
    this.vaultFile = path.join(this.vaultDir, 'election_keys.enc.json');
    this.vaultMasterSecret = process.env.KEY_VAULT_SECRET || 'dev_master_vault_passphrase_32_chars_min!';
    this.ensureVaultDirectory();
  }

  ensureVaultDirectory() {
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Derive a 256-bit AES master key using PBKDF2-SHA-256.
   * The salt is randomly generated on first vault creation and stored in the vault envelope.
   * @param {Buffer} salt - 16-byte random salt persisted in the vault file.
   * @returns {Buffer} 32-byte derived AES-256 key
   */
  getMasterKey(salt) {
    return crypto.pbkdf2Sync(this.vaultMasterSecret, salt, 200_000, 32, 'sha256');
  }

  loadVault() {
    this.ensureVaultDirectory();
    if (!fs.existsSync(this.vaultFile)) {
      return { data: {}, salt: null };
    }
    try {
      const fileData = fs.readFileSync(this.vaultFile, 'utf8');
      const { salt, iv, ciphertext, tag } = JSON.parse(fileData);
      const saltBuf = Buffer.from(salt, 'hex');
      const masterKey = this.getMasterKey(saltBuf);
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return { data: JSON.parse(decrypted), salt };
    } catch (err) {
      console.warn('[KeyStoreService] Failed to read vault or vault is empty:', err.message);
      return { data: {}, salt: null };
    }
  }

  saveVault(vaultData, existingSalt = null) {
    this.ensureVaultDirectory();
    // Reuse existing salt so the PBKDF2 output stays consistent within the same vault lifetime.
    // Generate a fresh 16-byte salt only on first-ever save.
    const saltBuf = existingSalt ? Buffer.from(existingSalt, 'hex') : crypto.randomBytes(16);
    const masterKey = this.getMasterKey(saltBuf);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
    let ciphertext = cipher.update(JSON.stringify(vaultData), 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    const envelope = {
      kdf: 'pbkdf2-sha256',
      kdfIterations: 200_000,
      salt: saltBuf.toString('hex'),
      iv: iv.toString('hex'),
      ciphertext,
      tag,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(this.vaultFile, JSON.stringify(envelope, null, 2), { mode: 0o600 });
    return saltBuf.toString('hex');
  }

  /**
   * Generate and safely store a new secp256k1 key pair for an election.
   * Only the public key is returned — the private key never leaves the vault.
   */
  generateElectionKeyPair(electionId) {
    const wallet = ethers.Wallet.createRandom();
    const electionPrivateKey = wallet.privateKey;
    const electionPublicKey = wallet.signingKey.publicKey; // 0x04... uncompressed 65-byte public key

    this.storeElectionPrivateKey(electionId, electionPrivateKey);

    return { electionPublicKey };
  }

  storeElectionPrivateKey(electionId, privateKeyHex) {
    const { data: vault, salt } = this.loadVault();
    vault[electionId] = {
      privateKey: privateKeyHex,
      storedAt: new Date().toISOString(),
    };
    this.saveVault(vault, salt);
  }

  getElectionPrivateKey(electionId) {
    const { data: vault } = this.loadVault();
    const entry = vault[electionId];
    if (!entry || !entry.privateKey) {
      throw new Error(`Election private key not found in key vault for election: ${electionId}`);
    }
    return entry.privateKey;
  }
}

module.exports = new KeyStoreService();
