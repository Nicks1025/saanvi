const BaseRepository = require('../../base/baseRepository');

/**
 * HealthRepository
 * Handles database health probing delegating strictly through BaseRepository.
 */
class HealthRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
  }

  /**
   * Executes database connectivity ping through the contextual DbDriver.
   */
  async checkDatabaseHealth() {
    return await this.dbDriver.healthCheck();
  }
}

module.exports = HealthRepository;

