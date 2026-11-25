const BaseService = require('../../base/baseService');
const { v4: uuidv4 } = require('uuid');
const ArrowPuzzleRepository = require('./arrowPuzzleRepository');
const { generatePuzzle } = require('./engine/Generator');

class ArrowPuzzleService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new ArrowPuzzleRepository(context);
  }

  generate(shape, level, liteMode) {
    if (liteMode && level > 5) {
      const err = new Error('Quick Play is restricted to a maximum of level 5. Please sign up to play more.');
      err.statusCode = 403;
      throw err;
    }

    const puzzle = generatePuzzle(level, shape);
    return puzzle;
  }

  async saveProgress(userUuid, shape, level, timeTaken) {
    const progressData = {
      uuid: uuidv4(),
      user_uuid: userUuid,
      shape: shape.toUpperCase(),
      level: level,
      time_taken_seconds: timeTaken
    };

    return this.repository.saveProgress(progressData);
  }

  async getProgress(userUuid) {
    const rows = await this.repository.getProgress(userUuid);

    const progressMap = {};
    if (Array.isArray(rows)) {
      for (const record of rows) {
        progressMap[record.shape] = record.max_level;
      }
    }

    return progressMap;
  }
}

module.exports = ArrowPuzzleService;
