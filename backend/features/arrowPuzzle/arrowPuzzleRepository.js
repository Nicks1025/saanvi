const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class ArrowPuzzleRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('arrow_puzzle_progress');
  }

  async saveProgress(progressData) {
    const query = this.sql
      .insert(progressData)
      .returning('*');

    const result = await this.execute(query);
    return result.rows[0];
  }

  async getProgress(userUuid) {
    return this.queryRaw(
      'SELECT shape, MAX(level) as max_level FROM arrow_puzzle_progress WHERE user_uuid = ? GROUP BY shape',
      [userUuid]
    );
  }
}

module.exports = ArrowPuzzleRepository;
