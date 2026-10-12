const express = require('express');
const router = express.Router();
const ballotController = require('../controllers/ballot.controller');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Prepare ballot (fetch election public key & candidate list)
router.post('/prepare', authenticate, ballotController.prepareBallot);

// Anonymous ballot submission (rate limited)
router.post('/submit', apiLimiter, ballotController.submitBallot);

// Check inclusion status
router.get('/status/:electionId/:nullifier', ballotController.getBallotStatus);

module.exports = router;
