const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    partyId: {
      type: String,
      required: true,
      trim: true,
    },
    electionId: {
      type: String,
      required: true,
      ref: 'Election',
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    symbolUrl: {
      type: String,
      trim: true,
    },
    manifestoSummary: {
      type: String,
      trim: true,
    },
    candidateIndex: {
      type: Number,
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

partySchema.index({ electionId: 1, partyId: 1 }, { unique: true });
partySchema.index({ electionId: 1, candidateIndex: 1 }, { unique: true });

module.exports = mongoose.model('Party', partySchema);
