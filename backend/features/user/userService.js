const BaseService = require('../../base/baseService');

class UserService extends BaseService {
  constructor(userRepository) {
    super(userRepository);
  }

  /**
   * Retrieves the current user's profile.
   */
  async getCurrentUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) {
      throw new Error('User not found.');
    }
    return { user };
  }

  /**
   * Updates the current user's settings.
   */
  async updateUserSettings(uuid, settings) {
    await this.repository.updateUserSettings(uuid, settings);
    return { success: true };
  }
}

module.exports = UserService;
