const express = require('express');
const router = express.Router();
const eligibilityController = require('../controllers/eligibility.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Admin register voter eligibility
router.post('/register', authenticate, authorize('admin'), eligibilityController.registerVoterEligibility);

// Admin bulk register voter eligibility (from Excel or batch IDs)
router.post('/bulk-register', authenticate, authorize('admin'), eligibilityController.bulkRegisterVoterEligibility);

// Admin get list of all registered voters
router.get('/registered-voters', authenticate, authorize('admin'), eligibilityController.getRegisteredVoters);

// Voter check their eligibility
router.get('/my/:electionId', authenticate, eligibilityController.checkMyEligibility);

// Voter issue credential commitment
router.post('/issue-credential', authenticate, eligibilityController.issueCredential);

// Voter get Merkle proof for credential
router.get('/proof/:electionId', authenticate, eligibilityController.getCredentialProof);

// Admin revoke credential
router.post('/revoke-credential', authenticate, authorize('admin'), eligibilityController.revokeCredential);

module.exports = router;
