const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class RbacRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('user_roles');
  }

  async getUserPermissions(userUuid) {
    const query = this.sql
      .select()
      .field('permissions.permission')
      .join('roles', 'user_roles.role_uuid', 'roles.uuid')
      .join('role_permissions', 'roles.uuid', 'role_permissions.role_uuid')
      .join('permissions', 'role_permissions.permission_uuid', 'permissions.uuid')
      .where('user_roles.user_uuid', '=', userUuid)
      .where('roles.is_active', '=', true)
      .whereNull('roles.archived_at')
      .where('permissions.is_active', '=', true)
      .whereNull('permissions.archived_at');

    const permsData = await this.runQuery(query);
    return permsData.map(row => row.permission).filter(Boolean);
  }
}

module.exports = RbacRepository;
