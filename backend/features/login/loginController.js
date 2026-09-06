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
      if (error.message === 'UNVERIFIED_EMAIL') {
        return res.status(401).json({ success: false, error: 'Your email address has not been verified. Please check your inbox or request a new verification email.', code: 'UNVERIFIED_EMAIL' });
      }
      return this.sendError(res, error.message, 401);
    }
  }
  async googleLogin(req, res) {
    try {
      this.validateRequiredParams(req.body, ['accessToken']);
      const { accessToken } = req.body;
      const result = await this.loginService.processGoogleLogin(accessToken);
      return this.sendSuccess(res, result, 'Google Login successful');
    } catch (error) {
      if (error.message === 'UNVERIFIED_EMAIL') {
        return res.status(401).json({ success: false, error: 'Your email address has not been verified. Please check your inbox or request a new verification email.', code: 'UNVERIFIED_EMAIL' });
      }
      const message = error.message
        ? error.message 
        : 'Google authentication failed.';
      return this.sendError(res, message, 401);
    }
  }

  async mfaVerify(req, res) {
    try {
      this.validateRequiredParams(req.body, ['email', 'code', 'supabaseToken']);
      const { email, code, supabaseToken } = req.body;
      const result = await this.loginService.processMfaVerify(email, code, supabaseToken);
      return this.sendSuccess(res, result, 'MFA Verification successful');
    } catch (error) {
      const message = error.message === 'Invalid MFA code.'
        ? error.message 
        : 'MFA verification failed.';
      return this.sendError(res, message, 401);
    }
  }
}

module.exports = LoginController;
