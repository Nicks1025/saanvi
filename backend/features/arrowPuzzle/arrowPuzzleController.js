const BaseController = require('../../base/baseController');
const arrowPuzzleService = require('./arrowPuzzleService');

class ArrowPuzzleController extends BaseController {
  constructor() {
    super('ArrowPuzzleController');
  }

  generate(req, res, next) {
    try {
      const { shape, level, liteMode } = req.query;
      
      const parsedLevel = parseInt(level, 10) || 1;
      const isLiteMode = liteMode === 'true';

      const puzzle = arrowPuzzleService.generate(shape, parsedLevel, isLiteMode);
      
      this.sendSuccess(res, puzzle, 'Puzzle generated successfully');
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async saveProgress(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const { shape, level, timeTaken } = req.body;
      
      const result = await arrowPuzzleService.saveProgress(userUuid, shape, level, timeTaken);
      
      this.sendSuccess(res, result, 'Progress saved successfully');
    } catch (error) {
      this.sendError(res, error);
    }
  }

  async getProgress(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const progress = await arrowPuzzleService.getProgress(userUuid);
      
      this.sendSuccess(res, progress, 'Progress fetched successfully');
    } catch (error) {
      this.sendError(res, error);
    }
  }
}

module.exports = new ArrowPuzzleController();
