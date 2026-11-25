const LoginRepository = require('./loginRepository');

describe('LoginRepository Unit & Contract Tests', () => {
  let repository;
  let mockContext;
  let mockDbDriver;

  beforeEach(() => {
    mockDbDriver = {
      runQuery: jest.fn(),
      runQueryFirst: jest.fn(),
      execute: jest.fn(),
      runQueryRaw: jest.fn(),
      transaction: jest.fn()
    };
    mockContext = {
      connection: mockDbDriver,
      logger: console
    };
    repository = new LoginRepository(mockContext);
  });

  describe('getUserByUuid', () => {
    it('returns null if user not found', async () => {
      mockDbDriver.runQueryFirst.mockResolvedValueOnce(null);
      const result = await repository.getUserByUuid('some-uuid');
      expect(result).toBeNull();
      expect(mockDbDriver.runQueryFirst).toHaveBeenCalled();
    });

    it('returns user with permissions when user is found and propagates transaction', async () => {
      const mockTrx = { isTransaction: true };
      const mockUser = { uuid: 'test-uuid', email: 'test@example.com' };
      mockDbDriver.runQueryFirst.mockResolvedValueOnce(mockUser);
      // First runQuery call for _getUserRoles, second for _getUserPermissions
      mockDbDriver.runQuery
        .mockResolvedValueOnce([{ name: 'Admin' }, { name: 'Manager' }])
        .mockResolvedValueOnce([{ permission: 'READ_TEST' }, { permission: 'WRITE_TEST' }]);

      const result = await repository.getUserByUuid('test-uuid', mockTrx);

      expect(result).toBeDefined();
      expect(result.uuid).toBe('test-uuid');
      expect(result.roles).toEqual(['Admin', 'Manager']);
      expect(result.role_name).toBe('Admin');
      expect(result.permissions).toEqual(['READ_TEST', 'WRITE_TEST']);

      // Verify transaction was propagated to runQueryFirst
      expect(mockDbDriver.runQueryFirst).toHaveBeenCalledWith(
        expect.anything(),
        [],
        mockTrx
      );
      // Verify transaction was propagated to both runQuery calls
      expect(mockDbDriver.runQuery).toHaveBeenNthCalledWith(1, expect.anything(), [], mockTrx);
      expect(mockDbDriver.runQuery).toHaveBeenNthCalledWith(2, expect.anything(), [], mockTrx);
    });
  });

  describe('Refresh Tokens', () => {
    describe('consumeRefreshToken', () => {
      it('atomically revokes token and returns record when 1 row is affected', async () => {
        const mockTrx = { isTransaction: true };
        const consumedRecord = {
          uuid: 'token-uuid-1',
          user_uuid: 'user-1',
          token_hash: 'hash-abc',
          revoked_at: new Date()
        };
        mockDbDriver.execute.mockResolvedValueOnce({
          affectedRows: 1,
          rows: [consumedRecord]
        });

        const result = await repository.consumeRefreshToken('hash-abc', mockTrx);

        expect(result).toEqual(consumedRecord);
        expect(mockDbDriver.execute).toHaveBeenCalled();
        const [query, params, trx] = mockDbDriver.execute.mock.calls[0];
        expect(trx).toBe(mockTrx);

        const sqlObj = query.toSQL();
        expect(sqlObj.sql).toContain('update "refresh_tokens" set "revoked_at" = ? where "token_hash" = ? and "revoked_at" is null and expires_at > NOW() returning *');
        expect(sqlObj.bindings).toContain('hash-abc');
      });

      it('returns null if 0 rows are affected (already revoked or expired)', async () => {
        mockDbDriver.execute.mockResolvedValueOnce({
          affectedRows: 0,
          rows: []
        });

        const result = await repository.consumeRefreshToken('already-used-hash');

        expect(result).toBeNull();
      });

      it('propagates unexpected database error without swallowing it', async () => {
        const dbErr = new Error('Database connection failed');
        mockDbDriver.execute.mockRejectedValueOnce(dbErr);

        await expect(repository.consumeRefreshToken('hash-abc')).rejects.toThrow('Database connection failed');
      });
    });

    it('saves a refresh token via execute() and propagates transaction', async () => {
      const mockTrx = { isTransaction: true };
      mockDbDriver.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await repository.saveRefreshToken('user-uuid', 'token-hash', '2026-09-01T00:00:00.000Z', mockTrx);

      expect(mockDbDriver.execute).toHaveBeenCalledWith(
        expect.anything(),
        [],
        mockTrx
      );
      const query = mockDbDriver.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('insert into "refresh_tokens"');
      expect(sqlObj.bindings).toEqual(['2026-09-01T00:00:00.000Z', 'token-hash', 'user-uuid']);
    });

    it('gets a valid refresh token with strictly NULL revoked_at (no 30s grace window)', async () => {
      mockDbDriver.runQueryFirst.mockResolvedValueOnce({ token_hash: 'valid-hash' });

      const result = await repository.getValidRefreshToken('valid-hash');

      expect(result).toEqual({ token_hash: 'valid-hash' });
      expect(mockDbDriver.runQueryFirst).toHaveBeenCalled();
      const query = mockDbDriver.runQueryFirst.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('select * from "refresh_tokens"');
      expect(sqlObj.sql).toContain('"token_hash" = ?');
      expect(sqlObj.sql).toContain('"revoked_at" is null');
      expect(sqlObj.sql).toContain('expires_at > NOW()');
      expect(sqlObj.sql).not.toContain('30 seconds');
      expect(sqlObj.bindings).toContain('valid-hash');
    });

    it('revokes a token by id via execute() without overriding existing revoked_at', async () => {
      mockDbDriver.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await repository.revokeRefreshTokenById('token-uuid');

      expect(mockDbDriver.execute).toHaveBeenCalled();
      const query = mockDbDriver.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('update "refresh_tokens" set "revoked_at" = ? where "uuid" = ? and "revoked_at" is null');
      expect(sqlObj.bindings[1]).toBe('token-uuid');
    });

    it('revokes a token by hash via execute() without overriding existing revoked_at', async () => {
      mockDbDriver.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await repository.revokeRefreshTokenByHash('token-hash');

      expect(mockDbDriver.execute).toHaveBeenCalled();
      const query = mockDbDriver.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('update "refresh_tokens" set "revoked_at" = ? where "token_hash" = ? and "revoked_at" is null');
      expect(sqlObj.bindings[1]).toBe('token-hash');
    });
  });

  describe('updateLastLogin', () => {
    it('updates last_login_at column for the user', async () => {
      mockDbDriver.execute.mockResolvedValueOnce({ affectedRows: 1, rows: [] });

      await repository.updateLastLogin('user-uuid-1');

      expect(mockDbDriver.execute).toHaveBeenCalled();
      const query = mockDbDriver.execute.mock.calls[0][0];
      const sqlObj = query.toSQL();
      expect(sqlObj.sql).toContain('update "users" set "last_login_at" = ? where "uuid" = ?');
      expect(sqlObj.bindings[1]).toBe('user-uuid-1');
    });
  });
});
