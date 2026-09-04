const BaseRepository = require('../../base/baseRepository');

class ArrowPuzzleRepository extends BaseRepository {
  async saveProgress(progressData) {
    const result = await this.queryHelper
      .from('arrow_puzzle_progress')
      .insert(progressData)
      .execute();
      
    return result[0];
  }

  async getProgress(userUuid) {
    const result = await this.queryHelper.queryRaw(
      'SELECT shape, MAX(level) as max_level FROM arrow_puzzle_progress WHERE user_uuid = ? GROUP BY shape',
      [userUuid]
    );
    
    return result.rows;
  }
}

module.exports = new ArrowPuzzleRepository();
