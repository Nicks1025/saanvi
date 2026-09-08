const BaseRepository = require('../../base/baseRepository');

class RbacRepository extends BaseRepository {
  async getUserPermissions(userUuid) {
    const permsData = await this.queryHelper
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
      return permsData.map(row => row.permission).filter(Boolean);
    }
    return [];
  }
}

module.exports = RbacRepository;
