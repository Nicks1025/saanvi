const BaseService = require('../../base/baseService');
const { v4: uuidv4 } = require('uuid');
const arrowPuzzleRepository = require('./arrowPuzzleRepository');
const { generatePuzzle } = require('./engine/Generator');

class ArrowPuzzleService extends BaseService {
  constructor() {
    super('ArrowPuzzleService');
  }

  generate(shape, level, liteMode) {
    if (liteMode && level > 5) {
      throw this.formatError('Validation', 'Quick Play is restricted to a maximum of level 5. Please sign up to play more.', 403);
    }
    
    // Additional logic for tracking, scoring, or logging can be added here later

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
    
    return await arrowPuzzleRepository.saveProgress(progressData);
  }

  async getProgress(userUuid) {
    const rows = await arrowPuzzleRepository.getProgress(userUuid);
      
    // Transform into a simple key-value object: { SQUARE: 5, HEART: 2 }
    const progressMap = {};
    for (const record of rows) {
      progressMap[record.shape] = record.max_level;
    }
    
    return progressMap;
  }
}

module.exports = new ArrowPuzzleService();
