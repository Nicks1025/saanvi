const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const wordSearchController = require('./wordSearchController');

const start = {
  path: '/start',
  verb: 'POST',
  auditMessage: 'starting word search puzzle',
  handler: {
    controller: wordSearchController,
    method: 'start'
  },
  middleware: {
    requirePermission: ['games.words.wordsearch']
  },
  request: {
    body: Joi.object({
      difficulty: Joi.string().valid('easy', 'medium', 'hard').required()
    })
  }
};

const validateWord = {
  path: '/validate',
  verb: 'POST',
  auditMessage: 'validating word selection',
  handler: {
    controller: wordSearchController,
    method: 'validateWord'
  },
  middleware: {
    requirePermission: ['games.words.wordsearch']
  },
  request: {
    body: Joi.object({
      puzzleUuid: Joi.string().uuid().required(),
      start: Joi.object({
        row: Joi.number().integer().min(0).required(),
        column: Joi.number().integer().min(0).required()
      }).required(),
      end: Joi.object({
        row: Joi.number().integer().min(0).required(),
        column: Joi.number().integer().min(0).required()
      }).required()
    })
  }
};

const completeGame = {
  path: '/complete',
  verb: 'POST',
  auditMessage: 'completing word search game',
  handler: {
    controller: wordSearchController,
    method: 'completeGame'
  },
  middleware: {
    requirePermission: ['games.words.wordsearch']
  },
  request: {
    body: Joi.object({
      puzzleUuid: Joi.string().uuid().required(),
      foundWords: Joi.array().items(Joi.string().uuid()).required(),
      elapsedSeconds: Joi.number().integer().min(0).required()
    })
  }
};

const getHint = {
  path: '/hint',
  verb: 'POST',
  auditMessage: 'getting hint for word search',
  handler: {
    controller: wordSearchController,
    method: 'getHint'
  },
  middleware: {
    requirePermission: ['games.words.wordsearch']
  },
  request: {
    body: Joi.object({
      puzzleUuid: Joi.string().uuid().required(),
      wordUuid: Joi.string().uuid().required()
    })
  }
};

const abortGame = {
  path: '/abort',
  verb: 'POST',
  auditMessage: 'aborting word search game',
  handler: {
    controller: wordSearchController,
    method: 'abortGame'
  },
  middleware: {
    requirePermission: ['games.words.wordsearch']
  },
  request: {
    body: Joi.object({
      puzzleUuid: Joi.string().uuid().required()
    })
  }
};

const WordSearchApi = {
  name: 'Word Search Games',
  url: '/api/games/word-search',
  endpoints: [
    start,
    validateWord,
    completeGame,
    getHint,
    abortGame
  ]
};

module.exports = new ApiSchema(WordSearchApi);
