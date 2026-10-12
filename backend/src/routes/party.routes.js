const express = require('express');
const router = express.Router();
const partyController = require('../controllers/party.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public route to get parties for an election
router.get('/election/:electionId', partyController.getElectionParties);

// Register a party candidate (Party Rep or Admin)
router.post('/', authenticate, authorize('admin', 'party_rep'), partyController.registerParty);

// Admin approval update
router.patch('/:id/approval', authenticate, authorize('admin'), partyController.updatePartyApproval);

module.exports = router;
