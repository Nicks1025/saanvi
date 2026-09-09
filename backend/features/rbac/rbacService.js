const BaseService = require('../../base/baseService');
const RbacRepository = require('./rbacRepository');

class RbacService extends BaseService {
  constructor(ignoredRepository) {
    super(new RbacRepository());
  }

  /**
   * Gets the effective permissions for a user from the database.
   */
  async getEffectivePermissions(userUuid) {
    try {
      return await this.repository.getUserPermissions(userUuid);
    } catch (err) {
      console.error('[RbacService] Database query failed:', err.message);
      return []; // Return empty permissions if DB fails
    }
  }
}

module.exports = RbacService;
