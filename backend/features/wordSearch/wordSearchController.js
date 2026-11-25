const BaseController = require('../../base/baseController');
const WordSearchService = require('./wordSearchService');

class WordSearchController extends BaseController {
  constructor(context = null) {
    super(context);
    this.wordSearchService = new WordSearchService(context);
  }
  
  async start(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { difficulty } = body;
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return this.respondError('Invalid difficulty', 400);
      }

      const puzzle = await this.wordSearchService.startPuzzle(difficulty);
      return this.respondOk(puzzle);
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async validateWord(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { puzzleUuid, start, end } = body;
      if (!puzzleUuid || !start || !end) {
        return this.respondError('Missing required fields', 400);
      }

      const result = await this.wordSearchService.validateWord(puzzleUuid, start, end);
      return this.respondOk(result);
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async completeGame(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { puzzleUuid, foundWords, elapsedSeconds } = body;
      if (!puzzleUuid || !Array.isArray(foundWords) || typeof elapsedSeconds !== 'number') {
        return this.respondError('Invalid request payload', 400);
      }

      const result = await this.wordSearchService.completeGame(puzzleUuid, foundWords, elapsedSeconds);
      return this.respondOk(result);
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async getHint(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { puzzleUuid, wordUuid } = body;
      if (!puzzleUuid || !wordUuid) {
        return this.respondError('Missing required fields', 400);
      }

      const hint = await this.wordSearchService.getHint(puzzleUuid, wordUuid);
      return this.respondOk(hint);
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async abortGame(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const { puzzleUuid } = body;
      const result = await this.wordSearchService.abortGame(puzzleUuid);
      return this.respondOk(result);
    } catch (error) {
      return this.respondError(error, 400);
    }
  }
}

module.exports = WordSearchController;
