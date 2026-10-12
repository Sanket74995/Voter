const express = require('express');
const router = express.Router();
const electionController = require('../controllers/election.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public / Authenticated read routes
router.get('/', electionController.getElections);
router.get('/:id', electionController.getElectionById);

// Admin election management routes
router.post('/', authenticate, authorize('admin'), electionController.createElection);
router.post('/:id/freeze', authenticate, authorize('admin'), electionController.freezeElection);
router.post('/:id/open', authenticate, authorize('admin'), electionController.openElection);
router.post('/:id/close', authenticate, authorize('admin'), electionController.closeElection);

module.exports = router;
