const mongoose = require('mongoose');

const voterEligibilitySchema = new mongoose.Schema(
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
    eligibilityStatus: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'REVOKED'],
      default: 'ELIGIBLE',
    },
    credentialIssuanceStatus: {
      type: String,
      enum: ['NOT_ISSUED', 'ISSUED', 'REVOKED'],
      default: 'NOT_ISSUED',
    },
    credentialIssuedAt: {
      type: Date,
      default: null,
    },
    verificationTimestamp: {
      type: Date,
      default: Date.now,
    },
    verifiedBy: {
      type: String,
      default: 'SYSTEM',
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on electionId and voterId
voterEligibilitySchema.index({ electionId: 1, voterId: 1 }, { unique: true });

module.exports = mongoose.model('VoterEligibility', voterEligibilitySchema);
