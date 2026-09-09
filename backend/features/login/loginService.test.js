const LoginService = require('./loginService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('jsonwebtoken');

describe('LoginService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      saveRefreshToken: jest.fn(),
      getValidRefreshToken: jest.fn(),
      revokeRefreshTokenById: jest.fn(),
      revokeRefreshTokenByHash: jest.fn(),
      getUserByUuid: jest.fn()
    };
    service = new LoginService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate an access token and save a refresh token', async () => {
      const mockUser = {
        uuid: 'user-123',
        email: 'test@example.com',
        is_mfa_enabled: false,
        language: 'en',
        theme: 'light',
        font: 'arial',
        role_name: 'Admin',
        permissions: ['READ']
      };

      jwt.sign.mockReturnValue('mock-access-token');

      const result = await service.generateTokens(mockUser);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(jwt.sign).toHaveBeenCalled();
      
      expect(mockRepository.saveRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.any(String), // hashed token
        expect.any(String)  // iso date string
      );
    });
  });

  describe('processRefreshToken', () => {
    it('should throw an error if no token is provided', async () => {
      await expect(service.processRefreshToken(null)).rejects.toThrow('Refresh token is required');
    });

    it('should throw an error if token is invalid or expired', async () => {
      mockRepository.getValidRefreshToken.mockResolvedValue(null);
      await expect(service.processRefreshToken('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should rotate token and return new tokens', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = { uuid: 'user-123', email: 'test@example.com', status: 'active' };

      mockRepository.getValidRefreshToken.mockResolvedValue(mockTokenRecord);
      mockRepository.getUserByUuid.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new-access-token');

      const result = await service.processRefreshToken('valid-refresh-token');

      expect(mockRepository.revokeRefreshTokenById).toHaveBeenCalledWith('token-uuid');
      expect(mockRepository.getUserByUuid).toHaveBeenCalledWith('user-123');
      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw if user is inactive after token validation', async () => {
      const mockTokenRecord = { uuid: 'token-uuid', user_uuid: 'user-123' };
      const mockUser = { uuid: 'user-123', status: 'inactive' };

      mockRepository.getValidRefreshToken.mockResolvedValue(mockTokenRecord);
      mockRepository.getUserByUuid.mockResolvedValue(mockUser);

      await expect(service.processRefreshToken('valid-refresh-token')).rejects.toThrow('User is inactive or deleted');
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      await service.logout('some-token');
      expect(mockRepository.revokeRefreshTokenByHash).toHaveBeenCalled();
    });

    it('should do nothing if no token provided', async () => {
      await service.logout(null);
      expect(mockRepository.revokeRefreshTokenByHash).not.toHaveBeenCalled();
    });
  });
});
