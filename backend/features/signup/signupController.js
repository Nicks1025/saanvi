const BaseController = require('../../base/baseController');
const SignupService = require('./signupService');

/**
 * SignupController
 * Handles HTTP request/response for the signup endpoints following Sofy architecture.
 */
class SignupController extends BaseController {
  constructor(context = null) {
    super(context);
    this.signupService = new SignupService(context);
  }

  async signup(req) {
    this.validateRequiredParams(req.body, ['email', 'password', 'firstName', 'lastName', 'displayName', 'gender']);
    const result = await this.signupService.processSignup(req.body);
    return this.respondOk(result, 'Account created successfully');
  }

  async resendVerification(req) {
    this.validateRequiredParams(req.body, ['email']);
    const result = await this.signupService.resendVerification(req.body.email);
    return this.respondOk(result, result.message);
  }
}

module.exports = SignupController;
