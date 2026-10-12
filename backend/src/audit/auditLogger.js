const AdministrativeAudit = require('../models/AdministrativeAudit');

/**
 * Privacy-preserving audit logger.
 * Strips any sensitive credentials, OTPs, or ballot data.
 */
const logAudit = async ({ action, performedBy, targetType, targetId, status = 'SUCCESS', details = {}, req = null }) => {
  try {
    const sanitizedDetails = { ...details };
    // Explicitly delete sensitive keys if accidentally passed
    const forbiddenKeys = ['password', 'passwordHash', 'otp', 'secretKey', 'privateKey', 'candidateChoice', 'choice', 'plainTextVote'];
    forbiddenKeys.forEach((key) => {
      delete sanitizedDetails[key];
    });

    const ipAddress = req ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '' : '';

    await AdministrativeAudit.create({
      action,
      performedBy: performedBy || 'ANONYMOUS_OR_SYSTEM',
      targetType,
      targetId: String(targetId || ''),
      status,
      details: sanitizedDetails,
      ipAddress: String(ipAddress),
    });
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
};

module.exports = { logAudit };
