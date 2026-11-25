const LoginController = require('./loginController');
const ApiContext = require('../../base/apiContext');

describe('LoginController Unit & Security Tests', () => {
  let controller;
  let mockLoginService;
  let mockReq;
  let mockRes;
  let context;

  beforeEach(() => {
    mockReq = {
      body: {},
      cookies: {},
      query: {},
      params: {},
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };

    context = new ApiContext(mockReq, mockRes);
    controller = new LoginController(context);

    mockLoginService = {
      processLogin: jest.fn(),
      processGoogleLogin: jest.fn(),
      processMfaVerify: jest.fn(),
      processRefreshToken: jest.fn(),
      logout: jest.fn()
    };
    controller.loginService = mockLoginService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('sets httpOnly cookie and strips refreshToken from JSON response', async () => {
      mockReq.body = { email: 'user@example.com', password: 'SecretPassword123!' };
      mockLoginService.processLogin.mockResolvedValue({
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });

      await controller.login(mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: expect.any(Number)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data).toEqual({ token: 'mock-access-token' });
      // CRITICAL SECURITY ASSERTION: refreshToken must NOT appear in JSON response
      expect(jsonResponse.data.refreshToken).toBeUndefined();
    });

    it('maps UNVERIFIED_EMAIL error to HTTP 401 with standard envelope', async () => {
      mockReq.body = { email: 'user@example.com', password: 'SecretPassword123!' };
      mockLoginService.processLogin.mockRejectedValue(new Error('UNVERIFIED_EMAIL'));

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.error.code).toBe('UNVERIFIED_EMAIL');
      expect(jsonResponse.data).toBeNull();
    });

    it('maps account suspended to HTTP 403 ACCOUNT_SUSPENDED', async () => {
      mockReq.body = { email: 'user@example.com', password: 'SecretPassword123!' };
      mockLoginService.processLogin.mockRejectedValue(
        new Error('Your account has been suspended by Admin, please contact admin to get your query resolved.')
      );

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('maps account locked to HTTP 423 ACCOUNT_LOCKED', async () => {
      mockReq.body = { email: 'user@example.com', password: 'SecretPassword123!' };
      mockLoginService.processLogin.mockRejectedValue(
        new Error('Account is locked. Please try again later.')
      );

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(423);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('does not leak internal database error or stack trace on HTTP 500', async () => {
      mockReq.body = { email: 'user@example.com', password: 'SecretPassword123!' };
      const internalDbError = new Error('connect ECONNREFUSED 127.0.0.1:5432; SELECT * FROM credentials WHERE 1=1');
      internalDbError.code = 'ECONNREFUSED';
      internalDbError.stack = 'Internal server stack trace with sensitive details';
      mockLoginService.processLogin.mockRejectedValue(internalDbError);

      await controller.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(jsonResponse.error.message).toBe('Login failed due to an internal server error.');
      expect(JSON.stringify(jsonResponse)).not.toContain('ECONNREFUSED');
      expect(JSON.stringify(jsonResponse)).not.toContain('SELECT');
      expect(JSON.stringify(jsonResponse)).not.toContain('stack trace');
    });
  });

  describe('refreshToken', () => {
    it('returns 401 UNAUTHORIZED if no refresh token cookie is present', async () => {
      mockReq.cookies = {};

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.error.code).toBe('UNAUTHORIZED');
    });

    it('successfully refreshes token, sets new cookie, and strips refreshToken from JSON response', async () => {
      mockReq.cookies = { refreshToken: 'old-refresh-token' };
      mockLoginService.processRefreshToken.mockResolvedValue({
        accessToken: 'new-jwt-access-token',
        refreshToken: 'new-rotated-refresh-token'
      });

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-rotated-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data).toEqual({ token: 'new-jwt-access-token' });
      expect(jsonResponse.data.refreshToken).toBeUndefined();
    });

    it('clears cookie if refresh token is rejected', async () => {
      mockReq.cookies = { refreshToken: 'invalid-or-reused-token' };
      mockLoginService.processRefreshToken.mockRejectedValue(new Error('Invalid or expired refresh token'));

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          path: '/'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('logout', () => {
    it('clears cookie and returns standard success envelope', async () => {
      mockReq.cookies = { refreshToken: 'active-refresh-token' };

      await controller.logout(mockReq, mockRes);

      expect(mockLoginService.logout).toHaveBeenCalledWith('active-refresh-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          path: '/'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const jsonResponse = mockRes.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data).toBeNull();
      expect(jsonResponse.message).toBe('Logged out successfully');
    });
  });
});
