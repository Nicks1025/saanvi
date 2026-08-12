const BaseController = require('../../base/baseController');

class LoginController extends BaseController {
  constructor(loginService) {
    super();
    this.loginService = loginService;
  }

  async login(req, res) {
    try {
      // 1. Request validation
      this.validateRequiredParams(req.body, ['email', 'password']);
      
      const { email, password } = req.body;

      // 2. Pass only required parameters to the service
      const result = await this.loginService.processLogin(email, password);

      // 3. Return successful response
      return this.sendSuccess(res, result, 'Login successful');
    } catch (error) {
      // Return a generic error for auth failures
      const message = error.message === 'Invalid email or password.' 
        ? error.message 
        : 'Invalid email or password.';
      return this.sendError(res, message, 401);
    }
  }
  async googleLogin(req, res) {
    try {
      this.validateRequiredParams(req.body, ['code']);
      const { code } = req.body;
      const result = await this.loginService.processGoogleLogin(code);
      return this.sendSuccess(res, result, 'Google Login successful');
    } catch (error) {
      const message = error.message === 'Invalid email or password.'
        ? error.message 
        : 'Google authentication failed.';
      return this.sendError(res, message, 401);
    }
  }
}

module.exports = LoginController;
