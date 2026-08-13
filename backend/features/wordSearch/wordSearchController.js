const BaseController = require('../../base/baseController');
const wordSearchService = require('./wordSearchService');

class WordSearchController extends BaseController {
  
  async start(req, res) {
    try {
      const { difficulty } = req.body;
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return this.sendError(res, 400, 'Invalid difficulty');
      }

      const puzzle = await wordSearchService.startPuzzle(difficulty);
      return this.sendSuccess(res, puzzle);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async validateWord(req, res) {
    try {
      const { puzzleUuid, start, end } = req.body;
      if (!puzzleUuid || !start || !end) {
        return this.sendError(res, 400, 'Missing required fields');
      }

      const result = await wordSearchService.validateWord(puzzleUuid, start, end);
      return this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async completeGame(req, res) {
    try {
      const { puzzleUuid, foundWords, elapsedSeconds } = req.body;
      if (!puzzleUuid || !Array.isArray(foundWords) || typeof elapsedSeconds !== 'number') {
        return this.sendError(res, 400, 'Invalid request payload');
      }

      const result = await wordSearchService.completeGame(puzzleUuid, foundWords, elapsedSeconds);
      return this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async getHint(req, res) {
    try {
      const { puzzleUuid, wordUuid } = req.body;
      if (!puzzleUuid || !wordUuid) {
        return this.sendError(res, 400, 'Missing required fields');
      }

      const hint = await wordSearchService.getHint(puzzleUuid, wordUuid);
      return this.sendSuccess(res, hint);
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async abortGame(req, res) {
    try {
      const { puzzleUuid } = req.body;
      if (!puzzleUuid) {
        return this.sendError(res, 400, 'Missing required fields');
      }

      const result = await wordSearchService.abortGame(puzzleUuid);
      return this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  }
}

module.exports = new WordSearchController();
