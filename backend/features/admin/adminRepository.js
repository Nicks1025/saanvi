const BaseRepository = require('../../base/baseRepository');

class AdminRepository extends BaseRepository {
  async getAllUsers(searchQuery) {
    const builder = this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('u.status')
      .field('u.created_at')
      .leftJoin('user_details', 'ud', 'u.uuid = ud.user_uuid')
      .field('ud.first_name')
      .field('ud.last_name')
      .where('u.archived_at', 'is', null);

    if (searchQuery) {
      builder.whereRaw(
        `(u.email ILIKE ? OR ud.first_name ILIKE ? OR ud.last_name ILIKE ?)`,
        [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
      );
    }

    const users = await builder.execute();
      
    // Because we could potentially have multiple rows if there were multiple joined records,
    // we want to ensure uniqueness by UUID.
    const uniqueUsersMap = {};
    for (const row of (users || [])) {
      if (!uniqueUsersMap[row.uuid]) {
        uniqueUsersMap[row.uuid] = {
          uuid: row.uuid,
          email: row.email,
          status: row.status,
          created_at: row.created_at,
          first_name: row.first_name || null,
          last_name: row.last_name || null
        };
      }
    }
    
    return Object.values(uniqueUsersMap);
  }

  async getAllPermissions() {
    return await this.queryHelper
      .from('permissions')
      .select('uuid, permission, name, description')
      .where('is_active', 'eq', true)
      .where('archived_at', 'is', null)
      .execute();
  }

  async getUserByUuid(userUuid) {
    const data = await this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('u.status')
      .field('u.created_at')
      .leftJoin('user_details', 'ud', 'u.uuid = ud.user_uuid')
      .field('ud.first_name')
      .field('ud.last_name')
      .where('u.uuid', 'eq', userUuid)
      .where('u.archived_at', 'is', null)
      .execute();
      
    if (data && data.length > 0) {
      const row = data[0];
      return {
        uuid: row.uuid,
        email: row.email,
        status: row.status,
        created_at: row.created_at,
        first_name: row.first_name || null,
        last_name: row.last_name || null
      };
    }
    return null;
  }

  async updateUser(uuid, payload) {
    return await this.queryHelper
      .from('users')
      .update(payload)
      .where('uuid', 'eq', uuid)
      .execute();
  }

  async updateUserDetails(uuid, payload) {
    // Upsert equivalent: check if exists, then update, else insert.
    const existing = await this.queryHelper
      .from('user_details')
      .select('uuid')
      .where('user_uuid', 'eq', uuid)
      .execute();

    if (existing && existing.length > 0) {
      return await this.queryHelper
        .from('user_details')
        .update(payload)
        .where('user_uuid', 'eq', uuid)
        .execute();
    } else {
      const { v4: uuidv4 } = require('uuid');
      return await this.queryHelper
        .from('user_details')
        .insert([{
          uuid: uuidv4(),
          user_uuid: uuid,
          ...payload
        }])
        .execute();
    }
  }

  async getAllRoles(searchQuery) {
    const builder = this.queryHelper
      .from('roles')
      .select('uuid, name, description, is_active, created_at, archived_at')
      .where('archived_at', 'is', null);

    if (searchQuery) {
      builder.whereRaw(
        `(name ILIKE ? OR description ILIKE ?)`,
        [`%${searchQuery}%`, `%${searchQuery}%`]
      );
    }
    
    return await builder.execute();
  }

  async getRoleByUuid(uuid) {
    const data = await this.queryHelper
      .from('roles')
      .select('uuid, name, description, is_active, created_at, archived_at')
      .where('uuid', 'eq', uuid)
      .where('archived_at', 'is', null)
      .execute();
      
    return data && data.length > 0 ? data[0] : null;
  }
  
  async getRoleByName(name) {
    const data = await this.queryHelper
      .from('roles')
      .select('uuid, name')
      .where('name', 'eq', name)
      .where('archived_at', 'is', null)
      .execute();
    return data && data.length > 0 ? data[0] : null;
  }

  async createRole(payload) {
    return await this.queryHelper
      .from('roles')
      .insert(payload)
      .execute();
  }

  async updateRole(uuid, payload) {
    return await this.queryHelper
      .from('roles')
      .update(payload)
      .where('uuid', 'eq', uuid)
      .execute();
  }

  async getRolePermissions(roleUuid) {
    return await this.queryHelper
      .from('role_permissions')
      .select('permission_uuid')
      .where('role_uuid', 'eq', roleUuid)
      .execute();
  }

  async updateRolePermissions(roleUuid, payload) {
    await this.queryHelper
      .from('role_permissions')
      .delete()
      .where('role_uuid', 'eq', roleUuid)
      .execute();
      
    if (payload.length > 0) {
      await this.queryHelper
        .from('role_permissions')
        .insert(payload)
        .execute();
    }
  }

  async getUserRoles(userUuid) {
    const data = await this.queryHelper
      .from('user_roles', 'ur')
      .join('roles', 'r', 'ur.role_uuid = r.uuid')
      .field('ur.role_uuid')
      .field('r.name')
      .field('r.is_active')
      .where('ur.user_uuid', 'eq', userUuid)
      .where('r.archived_at', 'is', null)
      .execute();
    return data || [];
  }

  async updateUserRoles(userUuid, payload) {
    await this.queryHelper
      .from('user_roles')
      .delete()
      .where('user_uuid', 'eq', userUuid)
      .execute();
      
    if (payload.length > 0) {
      await this.queryHelper
        .from('user_roles')
        .insert(payload)
        .execute();
    }
  }
}

module.exports = AdminRepository;
