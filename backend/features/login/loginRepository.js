const BaseRepository = require('../../base/baseRepository');

class LoginRepository extends BaseRepository {
  /**
   * Retrieves user authentication details by email.
   * STRICT RULE: Never query Supabase directly here. Always use queryHelper.
   */
  async getUserByEmail(email) {
    const data = await this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('u.password_hash')
      .field('u.is_mfa_enabled')
      .field('u.status')
      .field('u.is_email_verified')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .leftJoin('user_roles', 'ur', 'u.uuid = ur.user_uuid')
      .leftJoin('roles', 'r', 'ur.role_uuid = r.uuid')
      .field('r.name as role_name')
      .where('u.email', 'eq', email)
      .execute();

    if (!data || data.length === 0) {
      return null;
    }
    
    const user = data[0];
    let permissions = [];
    
    try {
      const permsData = await this.queryHelper
        .from('user_roles', 'ur')
        .join('roles', 'r', 'ur.role_uuid = r.uuid')
        .join('role_permissions', 'rp', 'r.uuid = rp.role_uuid')
        .join('permissions', 'p', 'rp.permission_uuid = p.uuid')
        .field('p.permission')
        .where('ur.user_uuid', 'eq', user.uuid)
        .where('r.is_active', 'eq', true)
        .where('r.archived_at', 'is', null)
        .where('p.is_active', 'eq', true)
        .where('p.archived_at', 'is', null)
        .execute();
        
      if (permsData) {
        permissions = permsData.map(row => row.permission).filter(Boolean);
      }
    } catch (err) {
      console.error('[LoginRepository] Failed to fetch role permissions for user:', err.message);
    }
    
    user.permissions = permissions;
    return user;
  }

  async getUserByUuid(uuid) {
    const data = await this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('u.password_hash')
      .field('u.is_mfa_enabled')
      .field('u.status')
      .field('u.is_email_verified')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .leftJoin('user_roles', 'ur', 'u.uuid = ur.user_uuid')
      .leftJoin('roles', 'r', 'ur.role_uuid = r.uuid')
      .field('r.name as role_name')
      .where('u.uuid', 'eq', uuid)
      .execute();

    if (!data || data.length === 0) {
      return null;
    }
    
    const user = data[0];
    let permissions = [];
    
    try {
      const permsData = await this.queryHelper
        .from('user_roles', 'ur')
        .join('roles', 'r', 'ur.role_uuid = r.uuid')
        .join('role_permissions', 'rp', 'r.uuid = rp.role_uuid')
        .join('permissions', 'p', 'rp.permission_uuid = p.uuid')
        .field('p.permission')
        .where('ur.user_uuid', 'eq', user.uuid)
        .where('r.is_active', 'eq', true)
        .where('r.archived_at', 'is', null)
        .where('p.is_active', 'eq', true)
        .where('p.archived_at', 'is', null)
        .execute();
        
      if (permsData) {
        permissions = permsData.map(row => row.permission).filter(Boolean);
      }
    } catch (err) {
      console.error('[LoginRepository] Failed to fetch role permissions for user:', err.message);
    }
    
    user.permissions = permissions;
    return user;
  }

  async saveRefreshToken(userUuid, tokenHash, expiresAtIso) {
    await this.queryHelper
      .from('refresh_tokens')
      .insert([{
          user_uuid: userUuid,
          token_hash: tokenHash,
          expires_at: expiresAtIso
      }])
      .execute();
  }

  async getValidRefreshToken(tokenHash) {
    const result = await this.queryHelper.queryRaw(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
      [tokenHash]
    );
    if (!result || !result.rows || result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  async revokeRefreshTokenById(uuid) {
    await this.queryHelper.queryRaw(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE uuid = ?',
      [uuid]
    );
  }

  async revokeRefreshTokenByHash(tokenHash) {
    await this.queryHelper.queryRaw(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );
  }
}

module.exports = LoginRepository;
