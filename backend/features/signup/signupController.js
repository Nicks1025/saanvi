const BaseController = require('../../base/baseController');

/**
 * SignupController
 * Handles HTTP request/response for the signup endpoint.
 */
class SignupController extends BaseController {
  constructor(signupService) {
    super();
    this.signupService = signupService;
  }

  async signup(req, res) {
    try {
      this.validateRequiredParams(req.body, ['email', 'password', 'firstName', 'lastName', 'displayName', 'phoneNumber', 'gender']);
      const result = await this.signupService.processSignup(req.body);
      return this.sendSuccess(res, result, 'Account created successfully');
    } catch (error) {
      const statusCode = error.message.includes('already exists') ? 409 : 400;
      return this.sendError(res, error.message, statusCode);
    }
  }
}

module.exports = SignupController;
