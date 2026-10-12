const mongoose = require('mongoose');

const administrativeAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['ELECTION', 'VOTER_ELIGIBILITY', 'PARTY', 'CREDENTIAL', 'TALLY', 'SYSTEM'],
    },
    targetId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

administrativeAuditSchema.index({ targetType: 1, action: 1 });
administrativeAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdministrativeAudit', administrativeAuditSchema);
