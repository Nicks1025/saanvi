const BaseController = require('../../base/baseController');
const AdminService = require('./adminService');

class AdminController extends BaseController {
  constructor(context = null) {
    super(context);
    this.adminService = new AdminService(context);
  }

  async getUsers(req, res) {
    const { search, archived, page, limit } = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
    const isArchived = archived === 'all' ? 'all' : archived === 'true';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    
    const result = await this.adminService.getAllUsers(search, isArchived, pageNum, limitNum);
    return this.respondPaginated(result.data, {
      pageNumber: pageNum,
      pageSize: limitNum,
      totalRecords: result.total
    }, 'Users retrieved successfully', res);
  }

  async getPermissions(req, res) {
    try {
      const permissions = await this.adminService.getAllPermissions();
      return this.respondOk(permissions, 'Permissions retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async getUser(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const user = await this.adminService.getUser(uuid);
      if (!user) return this.respondError('User not found', 404);
      return this.respondOk(user, 'User retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async updateUser(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const result = await this.adminService.updateUser(uuid, body);
      return this.respondOk(result, 'User updated successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.respondError(error.message, 404);
      }
      return this.respondError(error.message, 500);
    }
  }

  async createUser(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const result = await this.adminService.createUser(body);
      return this.respondOk(null, result.message || 'User created successfully', 201);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('not found')) {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }

  async archiveUser(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const result = await this.adminService.archiveUser(uuid);
      return this.respondOk(result, 'User archived successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.respondError(error.message, 404);
      }
      return this.respondError(error.message, 500);
    }
  }

  async restoreUser(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const result = await this.adminService.restoreUser(uuid);
      return this.respondOk(result, 'User restored successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.respondError(error.message, 404);
      }
      return this.respondError(error.message, 500);
    }
  }

  async deleteUser(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      await this.adminService.deleteUser(uuid);
      return this.respondOk(null, 'User deleted successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.respondError(error.message, 404);
      } else if (error.message.includes('constraint') || error.message.includes('associated records') || error.code === '23503') {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }

  async getRoles(req, res) {
    try {
      const { search } = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
      const roles = await this.adminService.getAllRoles(search);
      return this.respondOk(roles, 'Roles retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async getRole(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const role = await this.adminService.getRoleByUuid(uuid);
      if (!role) return this.respondError('Role not found', 404);
      return this.respondOk(role, 'Role retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async createRole(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      this.validateRequiredParams(body, ['name']);
      const result = await this.adminService.createRole(body);
      return this.respondOk(result, 'Role created successfully', 201);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('exists')) {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }

  async updateRole(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      this.validateRequiredParams(body, ['name']);
      const result = await this.adminService.updateRole(uuid, body);
      return this.respondOk(result, 'Role updated successfully');
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('exists') || error.message.includes('not found')) {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }

  async deleteRole(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const result = await this.adminService.deleteRole(uuid);
      return this.respondOk(result, 'Role deleted successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.respondError(error.message, 404);
      }
      return this.respondError(error.message, 500);
    }
  }

  async getRolePermissions(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const permissions = await this.adminService.getRolePermissions(uuid);
      return this.respondOk(permissions, 'Role permissions retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async updateRolePermissions(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      this.validateRequiredParams(body, ['permissionUuids']);
      const { permissionUuids } = body;
      
      const result = await this.adminService.updateRolePermissions(uuid, permissionUuids);
      return this.respondOk(result, 'Role permissions updated successfully');
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('not found')) {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }

  async getUserRoles(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const roles = await this.adminService.getUserRoles(uuid);
      return this.respondOk(roles, 'User roles retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }

  async updateUserRoles(req, res) {
    try {
      const { uuid } = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      this.validateRequiredParams(body, ['roleUuids']);
      const { roleUuids } = body;
      
      const result = await this.adminService.updateUserRoles(uuid, roleUuids);
      return this.respondOk(result, 'User roles updated successfully');
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('not found')) {
        return this.respondError(error.message, 400);
      }
      return this.respondError(error.message, 500);
    }
  }
}

module.exports = AdminController;
