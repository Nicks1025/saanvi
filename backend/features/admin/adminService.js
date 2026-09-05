const BaseService = require('../../base/baseService');
const RbacService = require('../rbac/rbacService');
const crypto = require('crypto');
const SignupRepository = require('../signup/signupRepository');
const SignupService = require('../signup/signupService');
const EmailService = require('../../services/emailService');
const { encrypt } = require('../../services/cryptoService');

class AdminService extends BaseService {
  constructor(adminRepository) {
    super(adminRepository);
    this.rbacService = new RbacService(adminRepository);
  }

  async getAllUsers(searchQuery, showArchived = false, page = 1, limit = 10) {
    return await this.repository.getAllUsers(searchQuery, showArchived, page, limit);
  }

  async getAllPermissions() {
    return await this.repository.getAllPermissions();
  }

  async getUser(uuid) {
    return await this.repository.getUserByUuid(uuid);
  }

  async updateUser(uuid, data) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) throw new Error('User not found.');

    const userPayload = {};
    if (data.status !== undefined) userPayload.status = data.status;
    
    if (Object.keys(userPayload).length > 0) {
      await this.repository.updateUser(uuid, userPayload);
    }

    const detailsPayload = {};
    if (data.first_name !== undefined) detailsPayload.first_name = data.first_name;
    if (data.last_name !== undefined) detailsPayload.last_name = data.last_name;

    if (Object.keys(detailsPayload).length > 0) {
      await this.repository.updateUserDetails(uuid, detailsPayload);
    }

    return await this.repository.getUserByUuid(uuid);
  }

  async archiveUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) throw new Error('User not found.');

    await this.repository.archiveUser(uuid);
    return await this.repository.getUserByUuid(uuid);
  }

  async restoreUser(uuid) {
    // Note: We bypass the getUserByUuid check since it ignores archived users,
    // or we can just call it if we change how getUserByUuid works. But it's easier
    // to just run the restore query directly since UUIDs are unique.
    await this.repository.restoreUser(uuid);
    return await this.repository.getUserByUuid(uuid);
  }

  async deleteUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid, true);
    if (!user) throw new Error('User not found.');

    const { supabaseAdmin } = require('../../services/supabaseAdmin');
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uuid);
    
    if (error) {
      console.error('[AdminService] Supabase delete user error:', error.message);
      throw new Error(`Failed to delete authentication user: ${error.message}`);
    }

    // Do NOT call this.repository.deleteUser(uuid) anymore.
    // PostgreSQL ON DELETE CASCADE will handle deleting the public records automatically.
    return true;
  }

  async createUser(userData) {
    // Simple 12-char random password (letters + digits).
    // argon2.hash() in SignupService adds a unique random salt automatically.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(12);
    const temporaryPassword = Array.from(bytes, b => chars[b % chars.length]).join('');

    // Delegate entirely to SignupService — zero duplication.
    const signupRepo = new SignupRepository(this.repository.queryHelper);
    const signupService = new SignupService(signupRepo);
    await signupService.processSignup({ ...userData, password: temporaryPassword });

    // After successful DB commit, directly queue the welcome email via BullMQ.
    // No variables are hardcoded here — all user data (first_name, email, etc.) 
    // is resolved at send time from the linked table configured on the template.
    // Only the temporary password is passed as an encrypted variable since it is not in any DB table.
    try {
      await EmailService.sendAsync({
        template: 'USER_ACCOUNT_CREATED',
        to: userData.email,
        encryptedVariables: { password: encrypt(temporaryPassword) },
        type: 'TRANSACTIONAL'
      });
    } catch (emailErr) {
      // Don't fail the whole request if email queueing fails — user is already created
      console.error('[AdminService] Failed to queue welcome email:', emailErr.message);
    }

    return { message: 'User created successfully. A welcome email has been queued for delivery.' };
  }

  async getAllRoles(searchQuery) {
    return await this.repository.getAllRoles(searchQuery);
  }

  async getRoleByUuid(uuid) {
    return await this.repository.getRoleByUuid(uuid);
  }

  async createRole(data) {
    if (!data.name) throw new Error('Role name is required.');
    const existing = await this.repository.getRoleByName(data.name);
    if (existing) throw new Error('Role with this name already exists.');

    const payload = {
      uuid: this.generateUuid(),
      name: data.name,
      description: data.description || null,
      is_active: data.is_active !== undefined ? data.is_active : true
    };
    await this.repository.createRole(payload);
    return payload;
  }

  async updateRole(uuid, data) {
    if (!data.name) throw new Error('Role name is required.');
    
    const role = await this.repository.getRoleByUuid(uuid);
    if (!role) throw new Error('Role not found.');

    const existing = await this.repository.getRoleByName(data.name);
    if (existing && existing.uuid !== uuid) throw new Error('Role with this name already exists.');

    const payload = {
      name: data.name,
      description: data.description || null,
      is_active: data.is_active !== undefined ? data.is_active : role.is_active
    };
    await this.repository.updateRole(uuid, payload);
    await this.rbacService.invalidateRoleCache(uuid);
    return { ...role, ...payload };
  }

  async deleteRole(uuid) {
    const role = await this.repository.getRoleByUuid(uuid);
    if (!role) throw new Error('Role not found.');
    
    await this.repository.deleteRole(uuid);
    await this.rbacService.invalidateRoleCache(uuid);
    return { uuid };
  }

  async getRolePermissions(roleUuid) {
    const records = await this.repository.getRolePermissions(roleUuid);
    return records.map(r => r.permission_uuid);
  }

  async updateRolePermissions(roleUuid, permissionUuids) {
    if (!Array.isArray(permissionUuids)) {
      throw new Error('Invalid input: permissionUuids must be an array.');
    }

    const role = await this.repository.getRoleByUuid(roleUuid);
    if (!role) throw new Error('Role not found.');

    const activePermissions = await this.repository.getAllPermissions();
    const activeUuids = activePermissions.map(p => p.uuid);

    const validUuidsToAssign = permissionUuids.filter(uuid => activeUuids.includes(uuid));
    const uniqueUuids = [...new Set(validUuidsToAssign)];

    const payload = uniqueUuids.map(permUuid => ({
      uuid: this.generateUuid(),
      role_uuid: roleUuid,
      permission_uuid: permUuid
    }));

    await this.repository.updateRolePermissions(roleUuid, payload);
    await this.rbacService.invalidateRoleCache(roleUuid);
    return { assigned_permissions: uniqueUuids };
  }

  async getUserRoles(userUuid) {
    const records = await this.repository.getUserRoles(userUuid);
    return records.map(r => r.role_uuid);
  }

  async updateUserRoles(userUuid, roleUuids) {
    if (!Array.isArray(roleUuids)) {
      throw new Error('Invalid input: roleUuids must be an array.');
    }

    const user = await this.repository.getUserByUuid(userUuid);
    if (!user) throw new Error('User not found.');

    const activeRoles = await this.repository.getAllRoles();
    const activeUuids = activeRoles.map(r => r.uuid);

    const validUuidsToAssign = roleUuids.filter(uuid => activeUuids.includes(uuid));
    const uniqueUuids = [...new Set(validUuidsToAssign)];

    const payload = uniqueUuids.map(rUuid => ({
      uuid: this.generateUuid(),
      user_uuid: userUuid,
      role_uuid: rUuid
    }));

    await this.repository.updateUserRoles(userUuid, payload);
    await this.rbacService.invalidateUserCache(userUuid);
    return { assigned_roles: uniqueUuids };
  }
}

module.exports = AdminService;
