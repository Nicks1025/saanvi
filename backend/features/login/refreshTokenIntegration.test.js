const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const defaultDbDriver = require('../../database/dbDriver');
const LoginService = require('./loginService');
const LoginRepository = require('./loginRepository');

describe('Refresh Token Rotation Real PostgreSQL Integration Tests', () => {
  jest.setTimeout(25000);
  let dbDriver;
  let service;
  let testUserUuid;
  let createdTokenUuids = [];

  beforeAll(async () => {
    dbDriver = defaultDbDriver;
    service = new LoginService();
    process.env.JWT_SECRET = 'integration-test-secret-key-12345';

    // Find an active user in the database
    const users = await dbDriver.runQuery(
      'SELECT uuid, email, status FROM users WHERE status = ? AND archived_at IS NULL LIMIT 1',
      ['active']
    );

    if (!users || users.length === 0) {
      throw new Error('No active user found in database for integration test');
    }
    testUserUuid = users[0].uuid;
  });

  afterEach(async () => {
    // Clean up any refresh tokens created during the test
    if (createdTokenUuids.length > 0) {
      await dbDriver.execute(
        'DELETE FROM refresh_tokens WHERE uuid = ANY(?)',
        [createdTokenUuids]
      );
      createdTokenUuids = [];
    }
  });

  afterAll(async () => {
    await dbDriver.close();
  });

  /**
   * Helper to insert a refresh token directly into PostgreSQL
   */
  async function insertTestToken(rawToken, { isRevoked = false, isExpired = false } = {}) {
    const tokenUuid = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = isExpired
      ? new Date(Date.now() - 60000).toISOString()
      : new Date(Date.now() + 3600000).toISOString();
    const revokedAt = isRevoked ? new Date().toISOString() : null;

    await dbDriver.execute(
      `INSERT INTO refresh_tokens (uuid, user_uuid, token_hash, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, ?)`,
      [tokenUuid, testUserUuid, tokenHash, expiresAt, revokedAt]
    );

    createdTokenUuids.push(tokenUuid);
    return { tokenUuid, tokenHash, rawToken };
  }

  it('rotates a valid refresh token and records atomic database state', async () => {
    const rawToken = 'test-token-valid-' + uuidv4();
    const { tokenUuid } = await insertTestToken(rawToken);

    const result = await service.processRefreshToken(rawToken);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');

    // Track the newly created token for cleanup
    const newHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    const newTokens = await dbDriver.runQuery('SELECT uuid FROM refresh_tokens WHERE token_hash = ?', [newHash]);
    if (newTokens.length > 0) {
      createdTokenUuids.push(newTokens[0].uuid);
    }

    // Verify original token is now marked as revoked in PostgreSQL
    const oldRows = await dbDriver.runQuery('SELECT revoked_at FROM refresh_tokens WHERE uuid = ?', [tokenUuid]);
    expect(oldRows.length).toBe(1);
    expect(oldRows[0].revoked_at).not.toBeNull();
  });

  it('rejects reuse of the original token after it was rotated', async () => {
    const rawToken = 'test-token-reuse-' + uuidv4();
    await insertTestToken(rawToken);

    // 1st rotation succeeds
    const firstResult = await service.processRefreshToken(rawToken);
    const newHash = crypto.createHash('sha256').update(firstResult.refreshToken).digest('hex');
    const newTokens = await dbDriver.runQuery('SELECT uuid FROM refresh_tokens WHERE token_hash = ?', [newHash]);
    if (newTokens.length > 0) {
      createdTokenUuids.push(newTokens[0].uuid);
    }

    // 2nd rotation attempt with same token must fail
    await expect(service.processRefreshToken(rawToken)).rejects.toThrow(
      'Invalid or expired refresh token'
    );
  });

  it('two concurrent requests using the same token cannot both succeed (atomic race condition test)', async () => {
    const rawToken = 'test-token-concurrent-' + uuidv4();
    await insertTestToken(rawToken);

    // Fire two simultaneous processRefreshToken calls
    const [res1, res2] = await Promise.allSettled([
      service.processRefreshToken(rawToken),
      service.processRefreshToken(rawToken)
    ]);

    const fulfilled = [res1, res2].filter(r => r.status === 'fulfilled');
    const rejected = [res1, res2].filter(r => r.status === 'rejected');

    // CRITICAL ATOMICITY GUARANTEE: Exactly 1 succeeds, exactly 1 fails
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.message).toBe('Invalid or expired refresh token');

    // Track new token for cleanup
    const replacementToken = fulfilled[0].value.refreshToken;
    const newHash = crypto.createHash('sha256').update(replacementToken).digest('hex');
    const newTokens = await dbDriver.runQuery('SELECT uuid FROM refresh_tokens WHERE token_hash = ?', [newHash]);
    if (newTokens.length > 0) {
      createdTokenUuids.push(newTokens[0].uuid);
    }
  });

  it('rejects an expired token', async () => {
    const rawToken = 'test-token-expired-' + uuidv4();
    await insertTestToken(rawToken, { isExpired: true });

    await expect(service.processRefreshToken(rawToken)).rejects.toThrow(
      'Invalid or expired refresh token'
    );
  });

  it('rejects an already revoked token', async () => {
    const rawToken = 'test-token-revoked-' + uuidv4();
    await insertTestToken(rawToken, { isRevoked: true });

    await expect(service.processRefreshToken(rawToken)).rejects.toThrow(
      'Invalid or expired refresh token'
    );
  });

  it('rejects a nonexistent token', async () => {
    await expect(service.processRefreshToken('nonexistent-token-' + uuidv4())).rejects.toThrow(
      'Invalid or expired refresh token'
    );
  });

  it('rolls back the token revocation if an error occurs during replacement token generation/persistence', async () => {
    const rawToken = 'test-token-rollback-' + uuidv4();
    const { tokenUuid } = await insertTestToken(rawToken);

    // Temporarily mock saveRefreshToken to throw
    const originalSave = service.repository.saveRefreshToken;
    service.repository.saveRefreshToken = jest.fn().mockRejectedValue(
      new Error('Simulated failure during replacement token persistence')
    );

    await expect(service.processRefreshToken(rawToken)).rejects.toThrow(
      'Simulated failure during replacement token persistence'
    );

    // Restore original method
    service.repository.saveRefreshToken = originalSave;

    // Check DB: because the transaction rolled back, revoked_at MUST STILL BE NULL!
    const rows = await dbDriver.runQuery('SELECT revoked_at FROM refresh_tokens WHERE uuid = ?', [tokenUuid]);
    expect(rows.length).toBe(1);
    expect(rows[0].revoked_at).toBeNull();
  });
});
