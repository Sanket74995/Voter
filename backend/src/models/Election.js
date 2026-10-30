const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema(
  {
    electionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'FROZEN', 'OPEN', 'CLOSED', 'PUBLISHED'],
      default: 'DRAFT',
    },
    configVersion: {
      type: Number,
      default: 1,
    },
    onChainElectionId: {
      type: Number,
      default: null,
    },
    credentialRoot: {
      type: String,
      default: '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    encryptionPublicKey: {
      type: String,
      default: '',
    },
    encryptedPrivateKey: {
      type: String,
      default: null,
    },
    totalEligibleVoters: {
      type: Number,
      default: 0,
    },
    turnoutCount: {
      type: Number,
      default: 0,
    },
    tallyResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    tallyVerificationArtifacts: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    recordedBallots: [
      {
        nullifier: { type: String, required: true },
        ballotCommitment: { type: String, required: true },
        encryptedBallot: { type: String, required: true },
        leafCommitment: String,
        merkleProof: [String],
        timestamp: { type: Date, default: Date.now },
        onChain: { type: Boolean, default: false },
        txHash: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

electionSchema.index({ status: 1 });
electionSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Election', electionSchema);
