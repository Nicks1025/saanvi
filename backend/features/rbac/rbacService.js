const BaseService = require('../../base/baseService');
const RedisHelper = require('../../redis/redisHelper');

class RbacService extends BaseService {
  constructor(loginRepository) {
    super(loginRepository);
  }

  /**
   * Generates the Redis key for a user's RBAC permissions.
   */
  _getCacheKey(userUuid) {
    return `saanvi:rbac:user:${userUuid}`;
  }

  /**
   * Gets the effective permissions for a user.
   * First tries Redis, then falls back to the database.
   */
  async getEffectivePermissions(userUuid) {
    const cacheKey = this._getCacheKey(userUuid);
    
    // 1. Attempt to get permissions from Redis
    const cachedPermissions = await RedisHelper.get(cacheKey);
    
    if (cachedPermissions !== null && Array.isArray(cachedPermissions)) {
      return cachedPermissions;
    }

    // 2. Cache miss or Redis unavailable, fall back to DB
    // We can reuse the logic from LoginRepository by fetching the user by their uuid
    // but LoginRepository's getUserByEmail does it by email. Let's do it directly here via queryHelper.
    let permissions = [];
    try {
      const permsData = await this.repository.queryHelper
        .from('user_roles', 'ur')
        .join('roles', 'r', 'ur.role_uuid = r.uuid')
        .join('role_permissions', 'rp', 'r.uuid = rp.role_uuid')
        .join('permissions', 'p', 'rp.permission_uuid = p.uuid')
        .field('p.permission')
        .where('ur.user_uuid', 'eq', userUuid)
        .where('r.is_active', 'eq', true)
        .where('r.archived_at', 'is', null)
        .where('p.is_active', 'eq', true)
        .where('p.archived_at', 'is', null)
        .execute();
        
      if (permsData) {
        permissions = permsData.map(row => row.permission).filter(Boolean);
      }
    } catch (err) {
      console.error('[RbacService] Database fallback failed:', err.message);
      return []; // Return empty permissions if DB fails
    }

    // 3. Store the result in Redis with TTL (15 minutes = 900 seconds)
    await RedisHelper.set(cacheKey, permissions, 900);
    
    return permissions;
  }

  /**
   * Invalidates a user's permission cache.
   */
  async invalidateUserCache(userUuid) {
    const cacheKey = this._getCacheKey(userUuid);
    await RedisHelper.delete(cacheKey);
  }

  /**
   * Invalidates permission cache for all users associated with a specific role.
   */
  async invalidateRoleCache(roleUuid) {
    try {
      const userRoles = await this.repository.queryHelper
        .from('user_roles')
        .select('user_uuid')
        .where('role_uuid', 'eq', roleUuid)
        .execute();
        
      if (userRoles && userRoles.length > 0) {
        // Delete cache for each user
        for (const ur of userRoles) {
          await this.invalidateUserCache(ur.user_uuid);
        }
      }
    } catch (err) {
      console.error(`[RbacService] Failed to invalidate cache for role ${roleUuid}:`, err.message);
    }
  }
}

module.exports = RbacService;
