const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/results.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Public results (candidate-level counts withheld until PUBLISHED)
router.get('/:id', resultsController.getResults);

// Admin trigger tally computation and publication
router.post('/:id/tally', authenticate, authorize('admin'), resultsController.tallyAndPublish);

// Public verification record for independent verifier CLI
router.get('/:id/public-record', resultsController.getPublicElectionRecord);

module.exports = router;
