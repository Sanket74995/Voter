const mongoose = require('mongoose');

const credentialIssuanceSchema = new mongoose.Schema(
  {
    electionId: {
      type: String,
      required: true,
      ref: 'Election',
      trim: true,
    },
    voterId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    // Cryptographic commitment C = Hash(secret, salt) registered in the Merkle root
    commitment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

credentialIssuanceSchema.index({ electionId: 1, voterId: 1 }, { unique: true });
credentialIssuanceSchema.index({ electionId: 1, commitment: 1 }, { unique: true });

module.exports = mongoose.model('CredentialIssuance', credentialIssuanceSchema);
