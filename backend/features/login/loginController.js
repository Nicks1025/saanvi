const BaseController = require('../../base/baseController');
const LoginService = require('./loginService');
const { getRefreshTokenExpiryMs } = require('./tokenConfig');

const AUTH_ERROR_MAP = {
  'UNVERIFIED_EMAIL': {
    status: 401,
    code: 'UNVERIFIED_EMAIL',
    message: 'Your email address has not been verified. Please check your inbox or request a new verification email.'
  },
  'No user exists with this email, please register youself.': {
    status: 401,
    code: 'USER_NOT_FOUND',
    message: 'No user exists with this email, please register youself.'
  },
  'Your account has been suspended by Admin, please contact admin to get your query resolved.': {
    status: 403,
    code: 'ACCOUNT_SUSPENDED',
    message: 'Your account has been suspended by Admin, please contact admin to get your query resolved.'
  },
  'Your account has been suspended by Admin, please contact admin to get your query resolved': {
    status: 403,
    code: 'ACCOUNT_SUSPENDED',
    message: 'Your account has been suspended by Admin, please contact admin to get your query resolved.'
  },
  'Account is locked. Please try again later.': {
    status: 423,
    code: 'ACCOUNT_LOCKED',
    message: 'Account is locked. Please try again later.'
  },
  'Invalid email or password.': {
    status: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password.'
  },
  'Google authentication failed.': {
    status: 401,
    code: 'GOOGLE_AUTH_FAILED',
    message: 'Google authentication failed.'
  },
  'MFA ticket is required.': {
    status: 400,
    code: 'MFA_TICKET_REQUIRED',
    message: 'MFA ticket is required.'
  },
  'Invalid or expired MFA ticket.': {
    status: 401,
    code: 'INVALID_MFA_TICKET',
    message: 'Invalid or expired MFA ticket.'
  },
  'Invalid MFA ticket.': {
    status: 401,
    code: 'INVALID_MFA_TICKET',
    message: 'Invalid MFA ticket.'
  },
  'No MFA factor found.': {
    status: 404,
    code: 'MFA_FACTOR_NOT_FOUND',
    message: 'No MFA factor found.'
  },
  'MFA Challenge failed.': {
    status: 401,
    code: 'MFA_CHALLENGE_FAILED',
    message: 'MFA Challenge failed.'
  },
  'Invalid MFA code.': {
    status: 401,
    code: 'INVALID_MFA_CODE',
    message: 'Invalid MFA code.'
  },
  'Refresh token is required': {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Refresh token is required'
  },
  'Invalid or expired refresh token': {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Invalid or expired refresh token'
  },
  'User is inactive or deleted': {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'User is inactive or deleted'
  }
};

class LoginController extends BaseController {
  constructor(context = null) {
    super(context);
    this.loginService = new LoginService(context);
  }

  _getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: getRefreshTokenExpiryMs()
    };
  }

  _getClearCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/'
    };
  }

  _handleAuthError(error, defaultMessage = 'Authentication failed.') {
    if (error.code && AUTH_ERROR_MAP[error.code]) {
      const mapped = AUTH_ERROR_MAP[error.code];
      return this.respondError(mapped.message, mapped.status, mapped.code);
    }
    if (error.message && AUTH_ERROR_MAP[error.message]) {
      const mapped = AUTH_ERROR_MAP[error.message];
      return this.respondError(mapped.message, mapped.status, mapped.code);
    }
    if (error.statusCode === 400 || error.message?.startsWith('Missing required field')) {
      return this.respondError(error.message, 400, 'VALIDATION_ERROR');
    }

    console.error('[LoginController Auth Error]', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return this.respondError(defaultMessage, 500, 'INTERNAL_SERVER_ERROR');
  }

  async login(req, res) {
    const body = req?.body || this.context?.request?.body;
    const response = this.context?.response || res;

    try {
      this.validateRequiredParams(body, ['email', 'password']);
      const { email, password } = body;

      const result = await this.loginService.processLogin(email, password);

      const { refreshToken: newRefreshToken, ...responseData } = result;

      if (newRefreshToken && response && typeof response.cookie === 'function') {
        response.cookie('refreshToken', newRefreshToken, this._getCookieOptions());
      }

      return this.respondOk(responseData, 'Login successful');
    } catch (error) {
      return this._handleAuthError(error, 'Login failed due to an internal server error.');
    }
  }

  async googleLogin(req, res) {
    const body = req?.body || this.context?.request?.body;
    const response = this.context?.response || res;

    try {
      this.validateRequiredParams(body, ['accessToken']);
      const { accessToken } = body;
      const result = await this.loginService.processGoogleLogin(accessToken);

      const { refreshToken: newRefreshToken, ...responseData } = result;

      if (newRefreshToken && response && typeof response.cookie === 'function') {
        response.cookie('refreshToken', newRefreshToken, this._getCookieOptions());
      }

      return this.respondOk(responseData, 'Google Login successful');
    } catch (error) {
      return this._handleAuthError(error, 'Google authentication failed.');
    }
  }

  async mfaVerify(req, res) {
    const body = req?.body || this.context?.request?.body;
    const response = this.context?.response || res;

    try {
      this.validateRequiredParams(body, ['email', 'code', 'mfaTicket']);
      const { email, code, mfaTicket } = body;
      const result = await this.loginService.processMfaVerify(email, code, mfaTicket);

      const { refreshToken: newRefreshToken, ...responseData } = result;

      if (newRefreshToken && response && typeof response.cookie === 'function') {
        response.cookie('refreshToken', newRefreshToken, this._getCookieOptions());
      }

      return this.respondOk(responseData, 'MFA Verification successful');
    } catch (error) {
      return this._handleAuthError(error, 'MFA verification failed.');
    }
  }

  async refreshToken(req, res) {
    const request = this.context?.request || req;
    const response = this.context?.response || res;

    try {
      const refreshToken = request?.cookies?.refreshToken;
      if (!refreshToken) {
        return this.respondError('No refresh token provided', 401, 'UNAUTHORIZED');
      }

      const result = await this.loginService.processRefreshToken(refreshToken);

      const { refreshToken: newRefreshToken, ...responseData } = result;

      if (newRefreshToken && response && typeof response.cookie === 'function') {
        response.cookie('refreshToken', newRefreshToken, this._getCookieOptions());
      }

      return this.respondOk({ token: responseData.accessToken }, 'Token refreshed successfully');
    } catch (error) {
      if (response && typeof response.clearCookie === 'function') {
        response.clearCookie('refreshToken', this._getClearCookieOptions());
      }
      return this._handleAuthError(error, 'Token refresh failed due to an internal server error.');
    }
  }

  async logout(req, res) {
    const request = this.context?.request || req;
    const response = this.context?.response || res;

    try {
      const refreshToken = request?.cookies?.refreshToken;
      if (refreshToken) {
        await this.loginService.logout(refreshToken);
        if (response && typeof response.clearCookie === 'function') {
          response.clearCookie('refreshToken', this._getClearCookieOptions());
        }
      }
      return this.respondOk(null, 'Logged out successfully');
    } catch (error) {
      console.error('[LoginController Logout Error]', error.message);
      return this.respondError('Logout failed', 500, 'INTERNAL_SERVER_ERROR');
    }
  }
}

module.exports = LoginController;
