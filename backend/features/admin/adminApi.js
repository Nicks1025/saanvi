const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');

const QueryHelper = require('../../database/queryHelper');
const AdminRepository = require('./adminRepository');
const AdminService = require('./adminService');
const AdminController = require('./adminController');

const queryHelper = new QueryHelper();
const adminRepository = new AdminRepository(queryHelper);
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

const getUsers = {
  path: '/users',
  verb: 'GET',
  auditMessage: 'getting users',
  handler: { controller: adminController, method: 'getUsers' },
  middleware: { requirePermission: ['admin.users'] }
};

const getUser = {
  path: '/users/:uuid',
  verb: 'GET',
  auditMessage: 'getting user by uuid',
  handler: { controller: adminController, method: 'getUser' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const updateUser = {
  path: '/users/:uuid',
  verb: 'PUT',
  auditMessage: 'updating user',
  handler: { controller: adminController, method: 'updateUser' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      first_name: Joi.string().optional(),
      last_name: Joi.string().optional(),
      status: Joi.string().optional()
    })
  }
};

const getUserRoles = {
  path: '/users/:uuid/roles',
  verb: 'GET',
  auditMessage: 'getting user roles',
  handler: { controller: adminController, method: 'getUserRoles' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const updateUserRoles = {
  path: '/users/:uuid/roles',
  verb: 'PUT',
  auditMessage: 'updating user roles',
  handler: { controller: adminController, method: 'updateUserRoles' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      roleUuids: Joi.array().items(Joi.string().uuid()).required()
    })
  }
};

const getRoles = {
  path: '/roles',
  verb: 'GET',
  auditMessage: 'getting roles',
  handler: { controller: adminController, method: 'getRoles' },
  middleware: { requirePermission: ['admin.roles'] }
};

const getRole = {
  path: '/roles/:uuid',
  verb: 'GET',
  auditMessage: 'getting role by uuid',
  handler: { controller: adminController, method: 'getRole' },
  middleware: { requirePermission: ['admin.roles'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const createRole = {
  path: '/roles',
  verb: 'POST',
  auditMessage: 'creating role',
  handler: { controller: adminController, method: 'createRole' },
  middleware: { requirePermission: ['admin.roles'] },
  request: {
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      is_active: Joi.boolean().optional()
    })
  }
};

const updateRole = {
  path: '/roles/:uuid',
  verb: 'PUT',
  auditMessage: 'updating role',
  handler: { controller: adminController, method: 'updateRole' },
  middleware: { requirePermission: ['admin.roles'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      is_active: Joi.boolean().optional()
    })
  }
};

const getRolePermissions = {
  path: '/roles/:uuid/permissions',
  verb: 'GET',
  auditMessage: 'getting role permissions',
  handler: { controller: adminController, method: 'getRolePermissions' },
  middleware: { requirePermission: ['admin.roles'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const updateRolePermissions = {
  path: '/roles/:uuid/permissions',
  verb: 'PUT',
  auditMessage: 'updating role permissions',
  handler: { controller: adminController, method: 'updateRolePermissions' },
  middleware: { requirePermission: ['admin.roles'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      permissionUuids: Joi.array().items(Joi.string().uuid()).required()
    })
  }
};

const getPermissions = {
  path: '/permissions',
  verb: 'GET',
  auditMessage: 'getting permissions',
  handler: { controller: adminController, method: 'getPermissions' },
  middleware: { requirePermission: ['admin.roles'] }
};

const archiveUser = {
  path: '/users/:uuid/archive',
  verb: 'PUT',
  auditMessage: 'archiving user',
  handler: { controller: adminController, method: 'archiveUser' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const restoreUser = {
  path: '/users/:uuid/restore',
  verb: 'PUT',
  auditMessage: 'restoring user',
  handler: { controller: adminController, method: 'restoreUser' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const deleteUser = {
  path: '/users/:uuid',
  verb: 'DELETE',
  auditMessage: 'deleting user',
  handler: { controller: adminController, method: 'deleteUser' },
  middleware: { requirePermission: ['admin.users'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const AdminApi = {
  name: 'Admin',
  url: '/api/admin',
  endpoints: [
    getUsers,
    getUser,
    updateUser,
    archiveUser,
    restoreUser,
    deleteUser,
    getUserRoles,
    updateUserRoles,
    getRoles,
    getRole,
    createRole,
    updateRole,
    getRolePermissions,
    updateRolePermissions,
    getPermissions
  ]
};

module.exports = new ApiSchema(AdminApi);
