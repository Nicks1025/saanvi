const Joi = require('joi');
const { verifyToken, requirePermission } = require('../../base/authMiddleware');
const ApiSchema = require('../../base/apiSchema');
const arrowPuzzleController = require('./arrowPuzzleController');

const conditionalAuth = (req, res, next) => {
  if (req.query.liteMode === 'true') {
    return next(); // Public access allowed for lite mode
  }
  
  // Otherwise, require full auth and permission
  verifyToken(req, res, (err) => {
    if (err) return next(err);
    if (res.headersSent) return; // verifyToken sends error directly
    requirePermission('games.puzzles.arrowpuzzle')(req, res, next);
  });
};

const generate = {
  path: '/generate',
  verb: 'GET',
  auditMessage: 'generating arrow puzzle',
  handler: {
    controller: arrowPuzzleController,
    method: 'generate'
  },
  middleware: {
    custom: [conditionalAuth]
  },
  request: {
    query: Joi.object({
      shape: Joi.string().required(),
      level: Joi.number().integer().min(1).required(),
      liteMode: Joi.string().valid('true', 'false').optional()
    })
  }
};

const saveProgress = {
  path: '/progress',
  verb: 'POST',
  auditMessage: 'saving arrow puzzle progress',
  handler: {
    controller: arrowPuzzleController,
    method: 'saveProgress'
  },
  middleware: {
    requirePermission: ['games.puzzles.arrowpuzzle']
  },
  request: {
    body: Joi.object({
      shape: Joi.string().required(),
      level: Joi.number().integer().min(1).required(),
      timeTaken: Joi.number().integer().min(0).required()
    })
  }
};

const getProgress = {
  path: '/progress',
  verb: 'GET',
  auditMessage: 'fetching arrow puzzle progress',
  handler: {
    controller: arrowPuzzleController,
    method: 'getProgress'
  },
  middleware: {
    requirePermission: ['games.puzzles.arrowpuzzle']
  }
};

const ArrowPuzzleApi = {
  name: 'Arrow Puzzle Games',
  url: '/api/games/arrow-puzzle',
  endpoints: [
    generate,
    saveProgress,
    getProgress
  ]
};

module.exports = new ApiSchema(ArrowPuzzleApi);
