const LoginService = require('./loginService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const argon2 = require('argon2');

jest.mock('jsonwebtoken');
jest.mock('argon2');

describe('LoginService Unit & Security Tests', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      saveRefreshToken: jest.fn(),
      consumeRefreshToken: jest.fn(),
      getValidRefreshToken: jest.fn(),
      revokeRefreshTokenById: jest.fn(),
      revokeRefreshTokenByHash: jest.fn(),
      getUserByUuid: jest.fn(),
      getUserByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      transaction: jest.fn(async (callback) => {
        const mockTrx = { isTransaction: true };
        return await callback(mockTrx);
      })
    };
    service = new LoginService();
    service.repository = mockRepository;
    process.env.JWT_SECRET = 'test-secret-key-12345';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate an access token and save a refresh token, propagating transaction if supplied', async () => {
      const mockTrx = { isTransaction: true };
      const mockUser = {
        uuid: 'user-123',
        email: 'test@example.com',
        is_mfa_enabled: false,
        language: 'en',
        theme: 'light',
        font: 'arial',
        role_name: 'Admin',
        permissions: ['READ_DASHBOARD', 'WRITE_USERS']
      };

      jwt.sign.mockReturnValue('mock-access-token');

      const result = await service.generateTokens(mockUser, mockTrx);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: 'user-123',
          email: 'test@example.com',
          roles: 'Admin',
          permissions: ['READ_DASHBOARD', 'WRITE_USERS']
        }),
        'test-secret-key-12345',
        expect.any(Object)
      );
      
      expect(mockRepository.saveRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String), // hashed token
        expect.any(String), // iso date string
        mockTrx
      );
    });
  });

  describe('processRefreshToken — Atomic Rotation & Concurrency', () => {
    it('throws an error if no token is provided', async () => {
      await expect(service.processRefreshToken(null)).rejects.toThrow('Refresh token is required');
    });

    it('successfully consumes a valid token, retrieves fresh roles/permissions, and returns new tokens within transaction', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = {
        uuid: 'user-123',
        email: 'test@example.com',
        status: 'active',
        role_name: 'Senior Admin',
        permissions: ['PERM_1', 'PERM_2']
      };

      mockRepository.consumeRefreshToken.mockResolvedValue(mockTokenRecord);
      mockRepository.getUserByUuid.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new-access-token');

      const result = await service.processRefreshToken('valid-refresh-token');

      expect(mockRepository.transaction).toHaveBeenCalled();
      expect(mockRepository.consumeRefreshToken).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ isTransaction: true }));
      expect(mockRepository.getUserByUuid).toHaveBeenCalledWith('user-123', expect.objectContaining({ isTransaction: true }));
      expect(mockRepository.saveRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ isTransaction: true })
      );

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('rejects an expired, nonexistent, or already revoked token (consumeRefreshToken returns null)', async () => {
      mockRepository.consumeRefreshToken.mockResolvedValue(null);

      await expect(service.processRefreshToken('reused-or-expired-token')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
      expect(mockRepository.getUserByUuid).not.toHaveBeenCalled();
      expect(mockRepository.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('prevents concurrent reuse: only first request succeeds, second request is rejected', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = { uuid: 'user-123', email: 'test@example.com', status: 'active' };

      // Request 1 matches the unconsumed token
      mockRepository.consumeRefreshToken.mockResolvedValueOnce(mockTokenRecord);
      // Request 2 finds 0 rows because revoked_at is no longer null
      mockRepository.consumeRefreshToken.mockResolvedValueOnce(null);

      mockRepository.getUserByUuid.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new-token-1');

      const req1Promise = service.processRefreshToken('concurrent-token');
      const req2Promise = service.processRefreshToken('concurrent-token');

      const [res1, res2Error] = await Promise.all([
        req1Promise,
        req2Promise.catch(err => err)
      ]);

      expect(res1).toHaveProperty('accessToken', 'new-token-1');
      expect(res2Error).toBeInstanceOf(Error);
      expect(res2Error.message).toBe('Invalid or expired refresh token');
    });

    it('rolls back transaction if replacement-token persistence fails (database error propagates)', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = { uuid: 'user-123', email: 'test@example.com', status: 'active' };

      mockRepository.consumeRefreshToken.mockResolvedValue(mockTokenRecord);
      mockRepository.getUserByUuid.mockResolvedValue(mockUser);
      mockRepository.saveRefreshToken.mockRejectedValue(new Error('DB Error: duplicate key or connection broken'));

      await expect(service.processRefreshToken('valid-token')).rejects.toThrow(
        'DB Error: duplicate key or connection broken'
      );
    });

    it('rejects and aborts if user is inactive, suspended or deleted', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = { uuid: 'user-123', status: 'inactive' };

      mockRepository.consumeRefreshToken.mockResolvedValue(mockTokenRecord);
      mockRepository.getUserByUuid.mockResolvedValue(mockUser);

      await expect(service.processRefreshToken('valid-refresh-token')).rejects.toThrow(
        'User is inactive or deleted'
      );
      expect(mockRepository.saveRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('processLogin flows', () => {
    it('throws if user does not exist', async () => {
      mockRepository.getUserByEmail.mockResolvedValue(null);

      await expect(service.processLogin('notfound@example.com', 'pwd')).rejects.toThrow(
        'No user exists with this email, please register youself.'
      );
    });

    it('throws if user is archived/suspended', async () => {
      mockRepository.getUserByEmail.mockResolvedValue({
        uuid: 'user-archived',
        email: 'archived@example.com',
        status: 'archived'
      });

      await expect(service.processLogin('archived@example.com', 'pwd')).rejects.toThrow(
        'Your account has been suspended by Admin, please contact admin to get your query resolved.'
      );
    });

    it('throws if user is locked', async () => {
      mockRepository.getUserByEmail.mockResolvedValue({
        uuid: 'user-locked',
        email: 'locked@example.com',
        status: 'locked'
      });

      await expect(service.processLogin('locked@example.com', 'pwd')).rejects.toThrow(
        'Account is locked. Please try again later.'
      );
    });

    it('throws if password verification fails', async () => {
      mockRepository.getUserByEmail.mockResolvedValue({
        uuid: 'user-1',
        email: 'test@example.com',
        status: 'active',
        password_hash: 'hash'
      });
      argon2.verify.mockResolvedValue(false);

      await expect(service.processLogin('test@example.com', 'wrong-pwd')).rejects.toThrow(
        'Invalid email or password.'
      );
    });

    it('throws UNVERIFIED_EMAIL if email is not verified', async () => {
      mockRepository.getUserByEmail.mockResolvedValue({
        uuid: 'user-1',
        email: 'test@example.com',
        status: 'active',
        password_hash: 'hash',
        is_email_verified: false
      });
      argon2.verify.mockResolvedValue(true);

      await expect(service.processLogin('test@example.com', 'correct-pwd')).rejects.toThrow(
        'UNVERIFIED_EMAIL'
      );
    });

    it('returns MFA challenge ticket if MFA is enabled', async () => {
      mockRepository.getUserByEmail.mockResolvedValue({
        uuid: 'user-1',
        email: 'test@example.com',
        status: 'active',
        password_hash: 'hash',
        is_email_verified: true,
        is_mfa_enabled: true
      });
      argon2.verify.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mfa-ticket-token');

      const result = await service.processLogin('test@example.com', 'correct-pwd');

      expect(result).toEqual({
        mfaRequired: true,
        email: 'test@example.com',
        mfaTicket: 'mfa-ticket-token'
      });
      expect(mockRepository.updateLastLogin).not.toHaveBeenCalled();
    });

    it('updates last_login_at upon successful login when MFA is not required', async () => {
      argon2.verify.mockResolvedValue(true);

      const mockUser = {
        uuid: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_pw',
        is_mfa_enabled: false,
        is_email_verified: true,
        status: 'active'
      };

      mockRepository.getUserByEmail.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-access-token');

      const result = await service.processLogin('test@example.com', 'password123');

      expect(mockRepository.updateLastLogin).toHaveBeenCalledWith('user-123');
      expect(result).toHaveProperty('token', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('processMfaVerify flows', () => {
    it('throws if mfaTicket is missing', async () => {
      await expect(service.processMfaVerify('test@example.com', '123456', null)).rejects.toThrow(
        'MFA ticket is required.'
      );
    });

    it('throws if mfaTicket is invalid or expired', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.processMfaVerify('test@example.com', '123456', 'bad-ticket')).rejects.toThrow(
        'Invalid or expired MFA ticket.'
      );
    });

    it('throws if mfaTicket email does not match provided email', async () => {
      jwt.verify.mockReturnValue({ email: 'other@example.com', purpose: 'mfa_login' });

      await expect(service.processMfaVerify('test@example.com', '123456', 'valid-ticket')).rejects.toThrow(
        'Invalid MFA ticket.'
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token by hash', async () => {
      await service.logout('some-token');
      expect(mockRepository.revokeRefreshTokenByHash).toHaveBeenCalled();
    });

    it('should do nothing if no token provided', async () => {
      await service.logout(null);
      expect(mockRepository.revokeRefreshTokenByHash).not.toHaveBeenCalled();
    });
  });
});
