const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');

const AdminController = require('./adminController');
const SqlController = require('./sqlController');
const EmailTemplateController = require('./emailTemplates/emailTemplateController');
const DynamicVariablesController = require('./dynamicVariables/dynamicVariablesController');

// ─── Users ────────────────────────────────────────────────────────────────────

const getUsers = {
  path: '/users',
  verb: 'GET',
  auditMessage: 'getting users',
  handler: { controller: AdminController, method: 'getUsers' },
  middleware: { requirePermission: ['admin.users.view'] }
};

const createUser = {
  path: '/users',
  verb: 'POST',
  auditMessage: 'creating user',
  handler: { controller: AdminController, method: 'createUser' },
  middleware: { requirePermission: ['admin.users.create'] },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().max(100).required(),
      lastName: Joi.string().max(100).required(),
      displayName: Joi.string().max(200).required(),
      phoneNumber: Joi.string().required(),
      dateOfBirth: Joi.string().required(),
      gender: Joi.string().required(),
      language: Joi.string().optional().default('en')
    }).unknown(true),
    stripUnknown: false
  }
};

const getUser = {
  path: '/users/:uuid',
  verb: 'GET',
  auditMessage: 'getting user by uuid',
  handler: { controller: AdminController, method: 'getUser' },
  middleware: { requirePermission: ['admin.users.view'] },
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
  handler: { controller: AdminController, method: 'updateUser' },
  middleware: { requirePermission: ['admin.users.edit'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      status: Joi.string().optional()
    })
  }
};

const getUserRoles = {
  path: '/users/:uuid/roles',
  verb: 'GET',
  auditMessage: 'getting user roles',
  handler: { controller: AdminController, method: 'getUserRoles' },
  middleware: { requirePermission: ['admin.users.view'] },
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
  handler: { controller: AdminController, method: 'updateUserRoles' },
  middleware: { requirePermission: ['admin.users.edit'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      roleUuids: Joi.array().items(Joi.string().uuid()).required()
    })
  }
};

const archiveUser = {
  path: '/users/:uuid/archive',
  verb: 'PUT',
  auditMessage: 'archiving user',
  handler: { controller: AdminController, method: 'archiveUser' },
  middleware: { requirePermission: ['admin.users.archive'] },
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
  handler: { controller: AdminController, method: 'restoreUser' },
  middleware: { requirePermission: ['admin.users.restore'] },
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
  handler: { controller: AdminController, method: 'deleteUser' },
  middleware: { requirePermission: ['admin.users.delete'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

// ─── Roles ────────────────────────────────────────────────────────────────────

const getRoles = {
  path: '/roles',
  verb: 'GET',
  auditMessage: 'getting roles',
  handler: { controller: AdminController, method: 'getRoles' },
  middleware: { requirePermission: ['admin.roles.view'] }
};

const getRole = {
  path: '/roles/:uuid',
  verb: 'GET',
  auditMessage: 'getting role by uuid',
  handler: { controller: AdminController, method: 'getRole' },
  middleware: { requirePermission: ['admin.roles.view'] },
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
  handler: { controller: AdminController, method: 'createRole' },
  middleware: { requirePermission: ['admin.roles.create'] },
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
  handler: { controller: AdminController, method: 'updateRole' },
  middleware: { requirePermission: ['admin.roles.edit'] },
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
  handler: { controller: AdminController, method: 'getRolePermissions' },
  middleware: { requirePermission: ['admin.roles.view'] },
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
  handler: { controller: AdminController, method: 'updateRolePermissions' },
  middleware: { requirePermission: ['admin.roles.edit'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      permissionUuids: Joi.array().items(Joi.string().uuid()).required()
    })
  }
};

const deleteRole = {
  path: '/roles/:uuid',
  verb: 'DELETE',
  auditMessage: 'deleting role',
  handler: { controller: AdminController, method: 'deleteRole' },
  middleware: { requirePermission: ['admin.roles.delete'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const getPermissions = {
  path: '/permissions',
  verb: 'GET',
  auditMessage: 'getting permissions',
  handler: { controller: AdminController, method: 'getPermissions' },
  middleware: { requirePermission: ['admin.roles.view'] }
};

// ─── SQL Editor ───────────────────────────────────────────────────────────────

const executeSql = {
  path: '/sql/execute',
  verb: 'POST',
  auditMessage: 'executing sql query',
  handler: { controller: SqlController, method: 'executeSql' },
  middleware: { requirePermission: ['admin.sql_editor'] },
  request: {
    body: Joi.object({
      databaseId: Joi.string().required(),
      query: Joi.string().required()
    })
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const getEmailTemplates = {
  path: '/email-templates',
  verb: 'GET',
  auditMessage: 'getting email templates',
  handler: { controller: EmailTemplateController, method: 'getAllTemplates' },
  middleware: { requirePermission: ['admin.email_templates.view'] }
};

const getEmailTemplate = {
  path: '/email-templates/:uuid',
  verb: 'GET',
  auditMessage: 'getting email template',
  handler: { controller: EmailTemplateController, method: 'getTemplate' },
  middleware: { requirePermission: ['admin.email_templates.view'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const createEmailTemplate = {
  path: '/email-templates',
  verb: 'POST',
  auditMessage: 'creating email template',
  handler: { controller: EmailTemplateController, method: 'createTemplate' },
  middleware: { requirePermission: ['admin.email_templates.create'] },
  request: {
    body: Joi.object({
      template_key: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      subject: Joi.string().required(),
      html_body: Joi.string().required(),
      plain_text_body: Joi.string().optional().allow(null, ''),
      status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
      available_variables: Joi.array().items(Joi.string()).optional(),
      editor_mode: Joi.string().valid('VISUAL', 'HTML').optional(),
      design_json: Joi.alternatives().try(Joi.object(), Joi.string()).optional().allow(null),
      linked_table: Joi.string().max(100).optional().allow(null, ''),
      linked_table_key: Joi.string().max(100).optional().allow(null, '')
    })
  }
};

const updateEmailTemplate = {
  path: '/email-templates/:uuid',
  verb: 'PUT',
  auditMessage: 'updating email template',
  handler: { controller: EmailTemplateController, method: 'updateTemplate' },
  middleware: { requirePermission: ['admin.email_templates.update'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional().allow(null, ''),
      subject: Joi.string().optional(),
      html_body: Joi.string().optional(),
      plain_text_body: Joi.string().optional().allow(null, ''),
      status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
      available_variables: Joi.array().items(Joi.string()).optional(),
      editor_mode: Joi.string().valid('VISUAL', 'HTML').optional(),
      design_json: Joi.alternatives().try(Joi.object(), Joi.string()).optional().allow(null),
      linked_table: Joi.string().max(100).optional().allow(null, ''),
      linked_table_key: Joi.string().max(100).optional().allow(null, '')
    })
  }
};

const deleteEmailTemplate = {
  path: '/email-templates/:uuid',
  verb: 'DELETE',
  auditMessage: 'deleting email template',
  handler: { controller: EmailTemplateController, method: 'deleteTemplate' },
  middleware: { requirePermission: ['admin.email_templates.update'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const previewEmailTemplate = {
  path: '/email-templates/preview',
  verb: 'POST',
  auditMessage: 'previewing email template',
  handler: { controller: EmailTemplateController, method: 'previewTemplate' },
  middleware: { requirePermission: ['admin.email_templates.view'] },
  request: {
    body: Joi.object({
      subject: Joi.string().required(),
      html_body: Joi.string().required(),
      preview_variables: Joi.object().unknown(true).optional()
    })
  }
};

const testEmailTemplate = {
  path: '/email-templates/:uuid/test',
  verb: 'POST',
  auditMessage: 'testing email template',
  handler: { controller: EmailTemplateController, method: 'testTemplate' },
  middleware: { requirePermission: ['admin.email_templates.view'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      recipient_email: Joi.string().email().required(),
      test_variables: Joi.object().unknown(true).optional()
    })
  }
};

const getEmailLogs = {
  path: '/email-logs',
  verb: 'GET',
  auditMessage: 'getting email logs',
  handler: { controller: EmailTemplateController, method: 'getEmailLogs' },
  middleware: { requirePermission: ['admin.email.logs'] },
  request: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1).optional(),
      limit: Joi.number().integer().min(1).max(100).default(10).optional(),
      search: Joi.string().allow('').optional()
    })
  }
};

const getEmailTemplateTableColumns = {
  path: '/email-templates/table-columns',
  verb: 'GET',
  auditMessage: 'getting table columns for email template',
  handler: { controller: EmailTemplateController, method: 'getTableColumns' },
  middleware: { requirePermission: ['admin.email_templates.view'] },
  request: {
    query: Joi.object({
      table: Joi.string().required()
    })
  }
};


// ─── Dynamic Variables ────────────────────────────────────────────────────────

const getDynamicVariables = {
  path: '/dynamic-variables',
  verb: 'GET',
  auditMessage: 'getting dynamic variables',
  handler: { controller: DynamicVariablesController, method: 'getAll' },
  middleware: { requirePermission: ['admin.dynamic_variables.view'] }
};

const createDynamicVariable = {
  path: '/dynamic-variables',
  verb: 'POST',
  auditMessage: 'creating dynamic variable',
  handler: { controller: DynamicVariablesController, method: 'create' },
  middleware: { requirePermission: ['admin.dynamic_variables.create'] },
  request: {
    body: Joi.object({
      variable_name: Joi.string().required(),
      label: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      value: Joi.string().optional().allow(null, '')
    })
  }
};

const updateDynamicVariable = {
  path: '/dynamic-variables/:uuid',
  verb: 'PUT',
  auditMessage: 'updating dynamic variable',
  handler: { controller: DynamicVariablesController, method: 'update' },
  middleware: { requirePermission: ['admin.dynamic_variables.update'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      variable_name: Joi.string().optional(),
      label: Joi.string().optional(),
      description: Joi.string().optional().allow(null, ''),
      value: Joi.string().optional().allow(null, '')
    })
  }
};

const deleteDynamicVariable = {
  path: '/dynamic-variables/:uuid',
  verb: 'DELETE',
  auditMessage: 'deleting dynamic variable',
  handler: { controller: DynamicVariablesController, method: 'delete' },
  middleware: { requirePermission: ['admin.dynamic_variables.delete'] },
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
    createUser,
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
    deleteRole,
    getRolePermissions,
    updateRolePermissions,
    getPermissions,
    executeSql,
    getEmailTemplates,
    getEmailTemplateTableColumns,
    getEmailTemplate,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    previewEmailTemplate,
    testEmailTemplate,
    getEmailLogs,
    getDynamicVariables,
    createDynamicVariable,
    updateDynamicVariable,
    deleteDynamicVariable
  ]
};

module.exports = new ApiSchema(AdminApi);
