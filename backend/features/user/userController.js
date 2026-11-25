const BaseController = require('../../base/baseController');
const UserService = require('./userService');

class UserController extends BaseController {
  constructor(context = null) {
    super(context);
    this.userService = new UserService(context);
  }

  _requireUserUuid() {
    const uuid = this.context?.user?.uuid;
    if (!uuid) {
      const error = new Error('Unauthorized: User context required');
      error.statusCode = 401;
      throw error;
    }
    return uuid;
  }

  async getMe() {
    const uuid = this._requireUserUuid();
    const result = await this.userService.getCurrentUser(uuid);
    return this.respondOk(result.user, 'User retrieved successfully');
  }

  async updateProfile(req) {
    const uuid = this._requireUserUuid();
    const file = req.file;
    const profileData = req.body;

    const result = await this.userService.updateUserProfile(uuid, profileData, file);
    return this.respondOk(result.user, 'Profile updated successfully');
  }

  async updateSettings(req) {
    const uuid = this._requireUserUuid();
    const { language, theme, font } = req.body;
    await this.userService.updateUserSettings(uuid, { language, theme, font });

    return this.respondOk(null, 'Settings updated successfully');
  }

  async changePassword(req) {
    const uuid = this._requireUserUuid();
    const { currentPassword, newPassword } = req.body;
    await this.userService.changePassword(uuid, currentPassword, newPassword);

    return this.respondOk(null, 'Password updated successfully');
  }

  async deleteAccount() {
    const uuid = this._requireUserUuid();
    const result = await this.userService.deleteAccount(uuid);
    return this.respondOk(result, 'Account deleted successfully');
  }
}

module.exports = UserController;
