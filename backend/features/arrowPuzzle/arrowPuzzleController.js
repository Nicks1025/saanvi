const BaseController = require('../../base/baseController');
const ArrowPuzzleService = require('./arrowPuzzleService');

class ArrowPuzzleController extends BaseController {
  constructor(context = null) {
    super(context);
    this.service = new ArrowPuzzleService(context);
  }

  generate(req, res) {
    const request = req || this.context?.request;
    const { shape, level, liteMode } = request.query;

    const parsedLevel = parseInt(level, 10) || 1;
    const isLiteMode = liteMode === 'true';

    const puzzle = this.service.generate(shape, parsedLevel, isLiteMode);
    return this.respondOk(puzzle, 'Puzzle generated successfully');
  }

  async saveProgress(req, res) {
    const request = req || this.context?.request;
    const userUuid = request.user?.uuid;
    const { shape, level, timeTaken } = request.body;

    const result = await this.service.saveProgress(userUuid, shape, level, timeTaken);
    return this.respondOk(result, 'Progress saved successfully');
  }

  async getProgress(req, res) {
    const request = req || this.context?.request;
    const userUuid = request.user?.uuid;

    const progress = await this.service.getProgress(userUuid);
    return this.respondOk(progress, 'Progress fetched successfully');
  }
}

module.exports = ArrowPuzzleController;
