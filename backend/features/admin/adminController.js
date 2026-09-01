const BaseController = require('../../base/baseController');

class AdminController extends BaseController {
  constructor(adminService) {
    super();
    this.adminService = adminService;
  }

  async getUsers(req, res) {
    try {
      const { search, archived, page, limit } = req.query;
      const isArchived = archived === 'all' ? 'all' : archived === 'true';
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      
      const result = await this.adminService.getAllUsers(search, isArchived, pageNum, limitNum);
      return this.sendSuccess(res, result, 'Users retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async getPermissions(req, res) {
    try {
      const permissions = await this.adminService.getAllPermissions();
      return this.sendSuccess(res, permissions, 'Permissions retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async getUser(req, res) {
    try {
      const { uuid } = req.params;
      const user = await this.adminService.getUser(uuid);
      if (!user) return this.sendError(res, 'User not found', 404);
      return this.sendSuccess(res, user, 'User retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async updateUser(req, res) {
    try {
      const { uuid } = req.params;
      const result = await this.adminService.updateUser(uuid, req.body);
      return this.sendSuccess(res, result, 'User updated successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async createUser(req, res) {
    try {
      const result = await this.adminService.createUser(req.body);
      return this.sendSuccess(res, null, result.message || 'User created successfully', 201);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('not found')) {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async archiveUser(req, res) {
    try {
      const { uuid } = req.params;
      const result = await this.adminService.archiveUser(uuid);
      return this.sendSuccess(res, result, 'User archived successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async restoreUser(req, res) {
    try {
      const { uuid } = req.params;
      const result = await this.adminService.restoreUser(uuid);
      return this.sendSuccess(res, result, 'User restored successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async deleteUser(req, res) {
    try {
      const { uuid } = req.params;
      await this.adminService.deleteUser(uuid);
      return this.sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      } else if (error.message.includes('constraint') || error.message.includes('associated records') || error.code === '23503') {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async getRoles(req, res) {
    try {
      const { search } = req.query;
      const roles = await this.adminService.getAllRoles(search);
      return this.sendSuccess(res, roles, 'Roles retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async getRole(req, res) {
    try {
      const { uuid } = req.params;
      const role = await this.adminService.getRoleByUuid(uuid);
      if (!role) return this.sendError(res, 'Role not found', 404);
      return this.sendSuccess(res, role, 'Role retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async createRole(req, res) {
    try {
      this.validateRequiredParams(req.body, ['name']);
      const result = await this.adminService.createRole(req.body);
      return this.sendSuccess(res, result, 'Role created successfully', 201);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('exists')) {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async updateRole(req, res) {
    try {
      const { uuid } = req.params;
      this.validateRequiredParams(req.body, ['name']);
      const result = await this.adminService.updateRole(uuid, req.body);
      return this.sendSuccess(res, result, 'Role updated successfully');
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('exists') || error.message.includes('not found')) {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async deleteRole(req, res) {
    try {
      const { uuid } = req.params;
      const result = await this.adminService.deleteRole(uuid);
      return this.sendSuccess(res, result, 'Role deleted successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.sendError(res, error.message, 404);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async getRolePermissions(req, res) {
    try {
      const { uuid } = req.params;
      const permissions = await this.adminService.getRolePermissions(uuid);
      return this.sendSuccess(res, permissions, 'Role permissions retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async updateRolePermissions(req, res) {
    try {
      const { uuid } = req.params;
      this.validateRequiredParams(req.body, ['permissionUuids']);
      const { permissionUuids } = req.body;
      
      const result = await this.adminService.updateRolePermissions(uuid, permissionUuids);
      return this.sendSuccess(res, result, 'Role permissions updated successfully');
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('not found')) {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }

  async getUserRoles(req, res) {
    try {
      const { uuid } = req.params;
      const roles = await this.adminService.getUserRoles(uuid);
      return this.sendSuccess(res, roles, 'User roles retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async updateUserRoles(req, res) {
    try {
      const { uuid } = req.params;
      this.validateRequiredParams(req.body, ['roleUuids']);
      const { roleUuids } = req.body;
      
      const result = await this.adminService.updateUserRoles(uuid, roleUuids);
      return this.sendSuccess(res, result, 'User roles updated successfully');
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('not found')) {
        return this.sendError(res, error.message, 400);
      }
      return this.sendError(res, error.message, 500);
    }
  }
}

module.exports = AdminController;
