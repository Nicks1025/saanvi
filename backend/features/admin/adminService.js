const BaseService = require('../../base/baseService');
const AdminRepository = require('./adminRepository');
const RbacService = require('../rbac/rbacService');
const crypto = require('crypto');
const SignupService = require('../signup/signupService');
const EmailService = require('../../services/emailService');
const { encrypt } = require('../../services/cryptoService');

class AdminService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new AdminRepository(context);
    this.rbacService = new RbacService(context);
  }

  async getAllUsers(searchQuery, showArchived = false, page = 1, limit = 10) {
    const result = await this.repository.getAllUsers(searchQuery, showArchived, page, limit);
    return {
      data: (result.data || []).map(u => ({
        uuid: u.uuid,
        email: u.email,
        status: u.status,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at || null,
        firstName: u.first_name,
        lastName: u.last_name
      })),
      total: result.total
    };
  }

  async getAllPermissions() {
    return await this.repository.getAllPermissions();
  }

  async getUser(uuid, includeArchived = false) {
    const u = await this.repository.getUserByUuid(uuid, includeArchived);
    if (!u) return null;
    return {
      uuid: u.uuid,
      email: u.email,
      status: u.status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at || null,
      firstName: u.first_name,
      lastName: u.last_name
    };
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
    if (data.firstName !== undefined) detailsPayload.first_name = data.firstName;
    if (data.lastName !== undefined) detailsPayload.last_name = data.lastName;

    if (Object.keys(detailsPayload).length > 0) {
      await this.repository.updateUserDetails(uuid, detailsPayload);
    }

    return await this.getUser(uuid);
  }

  async archiveUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) throw new Error('User not found.');

    await this.repository.archiveUser(uuid);
    return true;
  }

  async restoreUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid, true);
    if (!user) throw new Error('User not found.');

    await this.repository.restoreUser(uuid);
    return true;
  }

  async deleteUserPermanently(uuid) {
    const supabaseAdmin = require('../../services/supabaseAdmin');
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uuid);
    if (error) {
      throw new Error(`Failed to delete user from authentication provider: ${error.message}`);
    }

    // PostgreSQL ON DELETE CASCADE will handle deleting the public records automatically.
    return true;
  }

  async deleteUser(uuid) {
    return await this.deleteUserPermanently(uuid);
  }

  async createUser(userData) {
    // Simple 12-char random password (letters + digits).
    // argon2.hash() in SignupService adds a unique random salt automatically.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(12);
    const temporaryPassword = Array.from(bytes, b => chars[b % chars.length]).join('');

    // Delegate entirely to SignupService
    // We pass suppressSupabaseEmail: true to prevent Supabase from sending the verification instantly
    const signupService = new SignupService(this.context);
    await signupService.processSignup({ ...userData, password: temporaryPassword }, null, true);

    try {
      await EmailService.sendAsync({
        template: 'USER_ACCOUNT_CREATED',
        to: userData.email,
        encryptedVariables: { password: encrypt(temporaryPassword) },
        type: 'TRANSACTIONAL'
      });
      console.log(`[AdminService] Queued welcome email for ${userData.email}`);
    } catch (emailErr) {
      console.error('[AdminService] Failed to queue welcome email:', emailErr.message);
    }

    // NOW trigger the Supabase verification email to send, so it arrives AFTER the welcome email.
    try {
      await signupService.resendVerification(userData.email);
      console.log(`[AdminService] Triggered verification email for ${userData.email}`);
    } catch (verifyErr) {
      console.error('[AdminService] Failed to trigger verification email:', verifyErr.message);
    }

    return { message: 'User created successfully. Credentials and verification emails have been queued.' };
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
    return { ...role, ...payload };
  }

  async deleteRole(uuid) {
    const role = await this.repository.getRoleByUuid(uuid);
    if (!role) throw new Error('Role not found.');
    
    await this.repository.deleteRole(uuid);
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
    return { assigned_roles: uniqueUuids };
  }
}

module.exports = AdminService;
