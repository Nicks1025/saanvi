const LoginRepository = require('./loginRepository');
const QueryHelper = require('../../database/queryHelper');

jest.mock('../../database/queryHelper');

describe('LoginRepository', () => {
  let repository;
  let mockQueryHelper;
  let mockExecute;

  beforeEach(() => {
    mockExecute = jest.fn();
    mockQueryHelper = {
      from: jest.fn().mockReturnThis(),
      field: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      queryRaw: jest.fn(),
      execute: mockExecute
    };
    QueryHelper.mockImplementation(() => mockQueryHelper);
    repository = new LoginRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByUuid', () => {
    it('should return null if user not found', async () => {
      mockExecute.mockResolvedValueOnce([]); // users query returns empty
      const result = await repository.getUserByUuid('some-uuid');
      expect(result).toBeNull();
    });

    it('should return user with permissions', async () => {
      const mockUser = { uuid: 'test-uuid', email: 'test@test.com' };
      mockExecute
        .mockResolvedValueOnce([mockUser]) // First query (user data)
        .mockResolvedValueOnce([{ permission: 'READ_TEST' }, { permission: 'WRITE_TEST' }]); // Second query (permissions)

      const result = await repository.getUserByUuid('test-uuid');

      expect(result).toBeDefined();
      expect(result.uuid).toBe('test-uuid');
      expect(result.permissions).toEqual(['READ_TEST', 'WRITE_TEST']);
      expect(mockQueryHelper.from).toHaveBeenCalledWith('users', 'u');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('u.uuid', 'eq', 'test-uuid');
    });
  });

  describe('Refresh Tokens', () => {
    it('should save a refresh token', async () => {
      mockExecute.mockResolvedValueOnce(true);
      await repository.saveRefreshToken('user-uuid', 'token-hash', '2026-09-01T00:00:00.000Z');
      expect(mockQueryHelper.insert).toHaveBeenCalledWith([{
        user_uuid: 'user-uuid',
        token_hash: 'token-hash',
        expires_at: '2026-09-01T00:00:00.000Z'
      }]);
    });

    it('should get a valid refresh token', async () => {
      mockQueryHelper.queryRaw.mockResolvedValueOnce({ rows: [{ token_hash: 'valid-hash' }] });
      const result = await repository.getValidRefreshToken('valid-hash');
      expect(result).toEqual({ token_hash: 'valid-hash' });
      expect(mockQueryHelper.queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refresh_tokens WHERE token_hash = ?'),
        ['valid-hash']
      );
    });

    it('should revoke a token by id', async () => {
      await repository.revokeRefreshTokenById('token-uuid');
      expect(mockQueryHelper.queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE uuid = ?'),
        ['token-uuid']
      );
    });

    it('should revoke a token by hash', async () => {
      await repository.revokeRefreshTokenByHash('token-hash');
      expect(mockQueryHelper.queryRaw).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?'),
        ['token-hash']
      );
    });
  });
});
