const BaseController = require('../../base/baseController');

class UserController extends BaseController {
  constructor(userService) {
    super();
    this.userService = userService;
  }

  async getMe(req, res) {
    try {
      const uuid = req.user.uuid;
      if (!uuid) {
        return this.sendError(res, 'User ID missing in token', 400);
      }
      
      const result = await this.userService.getCurrentUser(uuid);
      return this.sendSuccess(res, result.user, 'User retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async updateProfile(req, res) {
    try {
      const uuid = req.user.uuid;
      if (!uuid) {
        return this.sendError(res, 'User ID missing in token', 400);
      }

      // Multer file is in req.file, other form fields in req.body
      const file = req.file;
      const profileData = req.body;

      const result = await this.userService.updateUserProfile(uuid, profileData, file);
      return this.sendSuccess(res, result.user, 'Profile updated successfully');
    } catch (error) {
      return this.sendError(res, error.message, 400);
    }
  }

  async updateSettings(req, res) {
    try {
      const uuid = req.user.uuid;
      if (!uuid) {
        return this.sendError(res, 'User ID missing in token', 400);
      }
      
      const { language, theme, font } = req.body;
      await this.userService.updateUserSettings(uuid, { language, theme, font });
      
      return this.sendSuccess(res, null, 'Settings updated successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }
  async changePassword(req, res) {
    try {
      const uuid = req.user.uuid;
      if (!uuid) {
        return this.sendError(res, 'User ID missing in token', 400);
      }
      
      const { currentPassword, newPassword } = req.body;
      await this.userService.changePassword(uuid, currentPassword, newPassword);
      
      return this.sendSuccess(res, null, 'Password updated successfully');
    } catch (error) {
      // If error message is 'Invalid current password.', return 400
      const statusCode = error.message === 'Invalid current password.' ? 400 : 500;
      return this.sendError(res, error.message, statusCode);
    }
  }
}

module.exports = UserController;
