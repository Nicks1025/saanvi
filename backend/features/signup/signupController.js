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
      this.validateRequiredParams(req.body, ['email', 'password', 'first_name', 'last_name', 'display_name', 'phone_number', 'gender']);
      const result = await this.signupService.processSignup(req.body);
      return this.sendSuccess(res, result, 'Account created successfully');
    } catch (error) {
      const statusCode = error.message.includes('already exists') ? 409 : 400;
      return this.sendError(res, error.message, statusCode);
    }
  }

  async resendVerification(req, res) {
    try {
      this.validateRequiredParams(req.body, ['email']);
      const result = await this.signupService.resendVerification(req.body.email);
      return this.sendSuccess(res, result, result.message);
    } catch (error) {
      const statusCode = error.message.includes('Please wait') ? 429 : 400;
      return this.sendError(res, error.message, statusCode);
    }
  }
}

module.exports = SignupController;
