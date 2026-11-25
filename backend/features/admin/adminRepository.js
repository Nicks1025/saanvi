const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');
const { v4: uuidv4 } = require('uuid');

class AdminRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlUsers = new QueryHelper('users');
    this.sqlUserDetails = new QueryHelper('user_details');
    this.sqlPermissions = new QueryHelper('permissions');
    this.sqlRoles = new QueryHelper('roles');
    this.sqlRolePermissions = new QueryHelper('role_permissions');
    this.sqlUserRoles = new QueryHelper('user_roles');
  }

  async getAllUsers(searchQuery, showArchived = false, page = 1, limit = 10) {
    const countQuery = this.sqlUsers
      .countDistinct('users.uuid', 'total')
      .leftJoin('user_details', 'users.uuid', 'user_details.user_uuid');

    const dataQuery = this.sqlUsers
      .select()
      .field('users.uuid')
      .field('users.email')
      .field('users.status')
      .field('users.created_at')
      .field('users.last_login_at')
      .field('user_details.first_name')
      .field('user_details.last_name')
      .leftJoin('user_details', 'users.uuid', 'user_details.user_uuid');

    if (showArchived === 'true' || showArchived === true) {
      countQuery.whereNotNull('users.archived_at');
      dataQuery.whereNotNull('users.archived_at');
    } else if (showArchived === 'all') {
      // show both active and archived
    } else {
      countQuery.whereNull('users.archived_at');
      dataQuery.whereNull('users.archived_at');
    }

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      countQuery.whereRaw('(users.email ILIKE ? OR user_details.first_name ILIKE ? OR user_details.last_name ILIKE ?)', [searchPattern, searchPattern, searchPattern]);
      dataQuery.whereRaw('(users.email ILIKE ? OR user_details.first_name ILIKE ? OR user_details.last_name ILIKE ?)', [searchPattern, searchPattern, searchPattern]);
    }

    const countRow = await this.runQueryFirst(countQuery);
    const total = countRow ? parseInt(countRow.total || 0, 10) : 0;

    dataQuery.limit(limit).offset((page - 1) * limit);
    const users = await this.runQuery(dataQuery);

    const uniqueUsersMap = {};
    for (const row of users) {
      if (!uniqueUsersMap[row.uuid]) {
        uniqueUsersMap[row.uuid] = {
          uuid: row.uuid,
          email: row.email,
          status: row.status,
          created_at: row.created_at,
          last_login_at: row.last_login_at || null,
          first_name: row.first_name || null,
          last_name: row.last_name || null
        };
      }
    }

    return {
      data: Object.values(uniqueUsersMap),
      total
    };
  }

  async getAllPermissions() {
    const query = this.sqlPermissions
      .select()
      .field('uuid')
      .field('permission')
      .field('name')
      .field('description')
      .where('is_active', '=', true)
      .whereNull('archived_at');

    return this.runQuery(query);
  }

  async getUserByUuid(userUuid, includeArchived = false) {
    const query = this.sqlUsers
      .select()
      .field('users.uuid')
      .field('users.email')
      .field('users.status')
      .field('users.created_at')
      .field('users.last_login_at')
      .field('user_details.first_name')
      .field('user_details.last_name')
      .leftJoin('user_details', 'users.uuid', 'user_details.user_uuid')
      .where('users.uuid', '=', userUuid);

    if (!includeArchived) {
      query.whereNull('users.archived_at');
    }

    const row = await this.runQueryFirst(query);
    if (!row) return null;

    return {
      uuid: row.uuid,
      email: row.email,
      status: row.status,
      created_at: row.created_at,
      last_login_at: row.last_login_at || null,
      first_name: row.first_name || null,
      last_name: row.last_name || null
    };
  }

  async updateUser(uuid, payload) {
    const query = this.sqlUsers
      .update(payload)
      .where('uuid', '=', uuid);

    return this.execute(query);
  }

  async updateUserDetails(uuid, payload) {
    const existing = await this.runQueryFirst(
      this.sqlUserDetails.select().field('uuid').where('user_uuid', '=', uuid)
    );

    if (existing) {
      const query = this.sqlUserDetails
        .update(payload)
        .where('user_uuid', '=', uuid);
      return this.execute(query);
    } else {
      const query = this.sqlUserDetails.insert({
        uuid: uuidv4(),
        user_uuid: uuid,
        ...payload
      });
      return this.execute(query);
    }
  }

  async archiveUser(uuid) {
    const query = this.sqlUsers
      .update({
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .where('uuid', '=', uuid);

    return this.execute(query);
  }

  async restoreUser(uuid) {
    const query = this.sqlUsers
      .update({
        status: 'active',
        archived_at: null
      })
      .where('uuid', '=', uuid);

    return this.execute(query);
  }

  async getAllRoles(searchQuery) {
    const query = this.sqlRoles
      .select()
      .field('uuid')
      .field('name')
      .field('description')
      .field('is_active')
      .field('created_at')
      .field('archived_at')
      .whereNull('archived_at');

    if (searchQuery) {
      query.whereRaw('(name ILIKE ? OR description ILIKE ?)', [`%${searchQuery}%`, `%${searchQuery}%`]);
    }

    return this.runQuery(query);
  }

  async getRoleByUuid(uuid) {
    const query = this.sqlRoles
      .select()
      .field('uuid')
      .field('name')
      .field('description')
      .field('is_active')
      .field('created_at')
      .field('archived_at')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');

    return this.runQueryFirst(query);
  }

  async getRoleByName(name) {
    const query = this.sqlRoles
      .select()
      .field('uuid')
      .field('name')
      .where('name', '=', name)
      .whereNull('archived_at');

    return this.runQueryFirst(query);
  }

  async createRole(payload) {
    const query = this.sqlRoles.insert(payload);
    return this.execute(query);
  }

  async updateRole(uuid, payload) {
    const query = this.sqlRoles
      .update(payload)
      .where('uuid', '=', uuid);

    return this.execute(query);
  }

  async deleteRole(uuid) {
    try {
      return await this.dbDriver.transaction(async (trx) => {
        const trxContext = this.context?.withTransaction ? this.context.withTransaction(trx) : { transaction: trx, connection: this.dbDriver };
        const trxRepo = new AdminRepository(trxContext);
        await trxRepo.execute(trxRepo.sqlRolePermissions.delete().where('role_uuid', '=', uuid));
        await trxRepo.execute(trxRepo.sqlUserRoles.delete().where('role_uuid', '=', uuid));
        await trxRepo.execute(trxRepo.sqlRoles.delete().where('uuid', '=', uuid));
      });
    } catch (err) {
      if (err.message && err.message.includes('violates foreign key constraint')) {
        const match = err.message.match(/on table "([^"]+)"/);
        const tableName = match ? match[1] : 'another table';
        throw new Error(`Cannot delete role because it is still referenced in '${tableName}'.`);
      }
      throw err;
    }
  }

  async getRolePermissions(roleUuid) {
    const query = this.sqlRolePermissions
      .select()
      .field('permission_uuid')
      .where('role_uuid', '=', roleUuid);

    return this.runQuery(query);
  }

  async updateRolePermissions(roleUuid, payload) {
    await this.execute(this.sqlRolePermissions.delete().where('role_uuid', '=', roleUuid));

    if (payload && payload.length > 0) {
      await this.execute(this.sqlRolePermissions.insert(payload));
    }
  }

  async getUserRoles(userUuid) {
    const query = this.sqlUserRoles
      .select()
      .field('user_roles.role_uuid')
      .field('roles.name')
      .field('roles.is_active')
      .join('roles', 'user_roles.role_uuid', 'roles.uuid')
      .where('user_roles.user_uuid', '=', userUuid)
      .whereNull('roles.archived_at');

    return this.runQuery(query);
  }

  async updateUserRoles(userUuid, payload) {
    await this.execute(this.sqlUserRoles.delete().where('user_uuid', '=', userUuid));

    if (payload && payload.length > 0) {
      await this.execute(this.sqlUserRoles.insert(payload));
    }
  }
}

module.exports = AdminRepository;
