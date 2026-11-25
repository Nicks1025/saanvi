const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class LoginRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('users', 'u');
    this.sqlUserRoles = new QueryHelper('user_roles', 'ur');
    this.sqlRefresh = new QueryHelper('refresh_tokens');
    this.sqlUsersSimple = new QueryHelper('users');
  }

  /**
   * Retrieves user authentication details by email.
   * Produces deterministic authorization data without duplicate join rows.
   */
  async getUserByEmail(email, transaction = null) {
    const query = this.sql
      .select()
      .field('u.uuid')
      .field('u.email')
      .field('u.password_hash')
      .field('u.is_mfa_enabled')
      .field('u.status')
      .field('u.is_email_verified')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .field('u.archived_at')
      .where('u.email', '=', email)
      .whereNull('u.archived_at');

    const user = await this.runQueryFirst(query, transaction);
    if (!user) {
      return null;
    }

    const roles = await this._getUserRoles(user.uuid, transaction);
    user.roles = roles;
    user.role_name = roles.length > 0 ? roles[0] : null;
    user.permissions = await this._getUserPermissions(user.uuid, transaction);
    return user;
  }

  /**
   * Retrieves user authentication details by UUID.
   * Produces deterministic authorization data without duplicate join rows.
   */
  async getUserByUuid(uuid, transaction = null) {
    const query = this.sql
      .select()
      .field('u.uuid')
      .field('u.email')
      .field('u.password_hash')
      .field('u.is_mfa_enabled')
      .field('u.status')
      .field('u.is_email_verified')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .field('u.archived_at')
      .where('u.uuid', '=', uuid)
      .whereNull('u.archived_at');

    const user = await this.runQueryFirst(query, transaction);
    if (!user) {
      return null;
    }

    const roles = await this._getUserRoles(user.uuid, transaction);
    user.roles = roles;
    user.role_name = roles.length > 0 ? roles[0] : null;
    user.permissions = await this._getUserPermissions(user.uuid, transaction);
    return user;
  }

  /**
   * Retrieves deterministic active roles for a user.
   */
  async _getUserRoles(userUuid, transaction = null) {
    const query = this.sqlUserRoles
      .select()
      .field('r.name')
      .innerJoin('roles as r', 'ur.role_uuid', 'r.uuid')
      .where('ur.user_uuid', '=', userUuid)
      .where('r.is_active', '=', true)
      .whereNull('r.archived_at')
      .orderBy('r.name', 'asc');

    const rows = await this.runQuery(query, transaction);
    return Array.isArray(rows) ? rows.map((r) => r.name) : [];
  }

  /**
   * Fetches user permissions. Fails closed by rethrowing unexpected database errors.
   */
  async _getUserPermissions(userUuid, transaction = null) {
    const permsQuery = this.sqlUserRoles
      .select()
      .field('p.permission')
      .innerJoin('roles as r', 'ur.role_uuid', 'r.uuid')
      .innerJoin('role_permissions as rp', 'r.uuid', 'rp.role_uuid')
      .innerJoin('permissions as p', 'rp.permission_uuid', 'p.uuid')
      .where('ur.user_uuid', '=', userUuid)
      .where('r.is_active', '=', true)
      .whereNull('r.archived_at')
      .where('p.is_active', '=', true)
      .whereNull('p.archived_at');

    const permsData = await this.runQuery(permsQuery, transaction);
    return Array.isArray(permsData) ? permsData.map((row) => row.permission).filter(Boolean) : [];
  }

  /**
   * Atomically consumes a refresh token: revokes it with revoked_at = NOW()
   * strictly only if matching token_hash, revoked_at IS NULL, and expires_at > NOW().
   * Returns the consumed token record if exactly one row was affected, or null otherwise.
   * Database errors are propagated.
   */
  async consumeRefreshToken(tokenHash, transaction = null) {
    const query = this.sqlRefresh
      .where('token_hash', '=', tokenHash)
      .whereNull('revoked_at')
      .whereRaw('expires_at > NOW()')
      .update({ revoked_at: new Date() });

    const result = await this.execute(query, transaction);
    if (result && result.affectedRows === 1 && Array.isArray(result.rows) && result.rows.length === 1) {
      return result.rows[0];
    }
    return null;
  }

  async saveRefreshToken(userUuid, tokenHash, expiresAtIso, transaction = null) {
    const query = this.sqlRefresh.insert({
      user_uuid: userUuid,
      token_hash: tokenHash,
      expires_at: expiresAtIso
    });
    await this.execute(query, transaction);
  }

  /**
   * Retrieves an unrevoked, unexpired refresh token.
   * Grace period has been strictly removed: revoked_at must be NULL.
   */
  async getValidRefreshToken(tokenHash, transaction = null) {
    const query = this.sqlRefresh
      .select()
      .field('*')
      .where('token_hash', '=', tokenHash)
      .whereNull('revoked_at')
      .whereRaw('expires_at > NOW()')
      .limit(1);

    return await this.runQueryFirst(query, transaction);
  }

  /**
   * Revokes refresh token by UUID via documented mutation execution method.
   * Only updates revoked_at if it is not already set, preserving the original revocation timestamp.
   */
  async revokeRefreshTokenById(uuid, transaction = null) {
    const query = this.sqlRefresh
      .where('uuid', '=', uuid)
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
    await this.execute(query, transaction);
  }

  /**
   * Revokes refresh token by hash via documented mutation execution method.
   * Only updates revoked_at if it is not already set, preserving the original revocation timestamp.
   */
  async revokeRefreshTokenByHash(tokenHash, transaction = null) {
    const query = this.sqlRefresh
      .where('token_hash', '=', tokenHash)
      .whereNull('revoked_at')
      .update({ revoked_at: new Date() });
    await this.execute(query, transaction);
  }

  async updateLastLogin(userUuid, transaction = null) {
    const query = this.sqlUsersSimple
      .where('uuid', '=', userUuid)
      .update({ last_login_at: new Date() });
    await this.execute(query, transaction);
  }
}

module.exports = LoginRepository;
