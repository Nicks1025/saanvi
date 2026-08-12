const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../base/authMiddleware');
const wordSearchController = require('./wordSearchController');

// All game endpoints require authentication
router.use(verifyToken);

router.post('/start', (req, res) => wordSearchController.start(req, res));
router.post('/validate', (req, res) => wordSearchController.validateWord(req, res));
router.post('/complete', (req, res) => wordSearchController.completeGame(req, res));
router.post('/hint', (req, res) => wordSearchController.getHint(req, res));

module.exports = router;
