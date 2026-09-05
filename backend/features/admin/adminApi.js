const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');

const QueryHelper = require('../../database/queryHelper');
const AdminRepository = require('./adminRepository');
const AdminService = require('./adminService');
const AdminController = require('./adminController');
const SqlService = require('./sqlService');
const SqlController = require('./sqlController');

const queryHelper = new QueryHelper();
const adminRepository = new AdminRepository(queryHelper);
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

const sqlService = new SqlService(queryHelper);
const sqlController = new SqlController(sqlService);

const EmailTemplateRepository = require('./emailTemplates/emailTemplateRepository');
const EmailTemplateService = require('./emailTemplates/emailTemplateService');
const EmailTemplateController = require('./emailTemplates/emailTemplateController');

const emailTemplateRepository = new EmailTemplateRepository(queryHelper);
const emailTemplateService = new EmailTemplateService(emailTemplateRepository);
const emailTemplateController = new EmailTemplateController(emailTemplateService);

const DynamicVariablesRepository = require('./dynamicVariables/dynamicVariablesRepository');
const DynamicVariablesService = require('./dynamicVariables/dynamicVariablesService');
const DynamicVariablesController = require('./dynamicVariables/dynamicVariablesController');

const dynamicVariablesRepository = new DynamicVariablesRepository(queryHelper);
const dynamicVariablesService = new DynamicVariablesService(dynamicVariablesRepository);
const dynamicVariablesController = new DynamicVariablesController(dynamicVariablesService);

// ─── Users ────────────────────────────────────────────────────────────────────

const getUsers = {
  path: '/users',
  verb: 'GET',
  auditMessage: 'getting users',
  handler: { controller: adminController, method: 'getUsers' },
  middleware: { requirePermission: ['admin.users.view'] }
};

const createUser = {
  path: '/users',
  verb: 'POST',
  auditMessage: 'creating user',
  handler: { controller: adminController, method: 'createUser' },
  middleware: { requirePermission: ['admin.users.create'] },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      first_name: Joi.string().max(100).required(),
      last_name: Joi.string().max(100).required(),
      display_name: Joi.string().max(200).required(),
      phone_number: Joi.string().required(),
      date_of_birth: Joi.string().required(),
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
  handler: { controller: adminController, method: 'getUser' },
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
  handler: { controller: adminController, method: 'updateUser' },
  middleware: { requirePermission: ['admin.users.edit'] },
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
  handler: { controller: adminController, method: 'updateUserRoles' },
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
  handler: { controller: adminController, method: 'archiveUser' },
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
  handler: { controller: adminController, method: 'restoreUser' },
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
  handler: { controller: adminController, method: 'deleteUser' },
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
  handler: { controller: adminController, method: 'getRoles' },
  middleware: { requirePermission: ['admin.roles.view'] }
};

const getRole = {
  path: '/roles/:uuid',
  verb: 'GET',
  auditMessage: 'getting role by uuid',
  handler: { controller: adminController, method: 'getRole' },
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
  handler: { controller: adminController, method: 'createRole' },
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
  handler: { controller: adminController, method: 'updateRole' },
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
  handler: { controller: adminController, method: 'getRolePermissions' },
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
  handler: { controller: adminController, method: 'updateRolePermissions' },
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
  handler: { controller: adminController, method: 'deleteRole' },
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
  handler: { controller: adminController, method: 'getPermissions' },
  middleware: { requirePermission: ['admin.roles.view'] }
};

// ─── SQL Editor ───────────────────────────────────────────────────────────────

const executeSql = {
  path: '/sql/execute',
  verb: 'POST',
  auditMessage: 'executing sql query',
  handler: { controller: sqlController, method: 'executeSql' },
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
  handler: { controller: emailTemplateController, method: 'getAllTemplates' },
  middleware: { requirePermission: ['admin.email_templates.view'] }
};

const getEmailTemplate = {
  path: '/email-templates/:uuid',
  verb: 'GET',
  auditMessage: 'getting email template',
  handler: { controller: emailTemplateController, method: 'getTemplate' },
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
  handler: { controller: emailTemplateController, method: 'createTemplate' },
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
  handler: { controller: emailTemplateController, method: 'updateTemplate' },
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
  handler: { controller: emailTemplateController, method: 'deleteTemplate' },
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
  handler: { controller: emailTemplateController, method: 'previewTemplate' },
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
  handler: { controller: emailTemplateController, method: 'testTemplate' },
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
  handler: { controller: emailTemplateController, method: 'getEmailLogs' },
  middleware: { requirePermission: ['admin.email.logs'] }
};

const getEmailTemplateTableColumns = {
  path: '/email-templates/table-columns',
  verb: 'GET',
  auditMessage: 'getting table columns for email template',
  handler: { controller: emailTemplateController, method: 'getTableColumns' },
  middleware: { requirePermission: ['admin.email_templates.view'] },
  request: {
    query: Joi.object({
      table: Joi.string().required()
    })
  }
};

const WorkflowController = require('./workflowController');
const workflowController = new WorkflowController();

const getWorkflows = {
  path: '/workflows',
  verb: 'GET',
  auditMessage: 'getting workflows',
  handler: { controller: workflowController, method: 'getWorkflows' },
  middleware: { requirePermission: ['admin.workflows.view'] } // Reusing a standard admin permission pattern
};

const getWorkflowDetails = {
  path: '/workflows/:id',
  verb: 'GET',
  auditMessage: 'getting workflow details',
  handler: { controller: workflowController, method: 'getWorkflowDetails' },
  middleware: { requirePermission: ['admin.workflows.view'] },
  request: {
    params: Joi.object({ id: Joi.string().uuid().required() })
  }
};

const createWorkflow = {
  path: '/workflows',
  verb: 'POST',
  auditMessage: 'creating workflow',
  handler: { controller: workflowController, method: 'createWorkflow' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    body: Joi.object({
      trigger_event_key: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      active: Joi.boolean().optional(),
      conditions: Joi.array().optional(),
      actions: Joi.array().optional()
    })
  }
};

const updateWorkflow = {
  path: '/workflows/:id',
  verb: 'PUT',
  auditMessage: 'updating workflow',
  handler: { controller: workflowController, method: 'updateWorkflow' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    params: Joi.object({ id: Joi.string().uuid().required() }),
    body: Joi.object({
      trigger_event_key: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      active: Joi.boolean().optional(),
      conditions: Joi.array().optional(),
      actions: Joi.array().optional()
    })
  }
};

const deleteWorkflow = {
  path: '/workflows/:id',
  verb: 'DELETE',
  auditMessage: 'deleting workflow',
  handler: { controller: workflowController, method: 'deleteWorkflow' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    params: Joi.object({ id: Joi.string().uuid().required() })
  }
};

const getSystemEvents = {
  path: '/system-events',
  verb: 'GET',
  auditMessage: 'getting system events',
  handler: { controller: workflowController, method: 'getSystemEvents' },
  middleware: { requirePermission: ['admin.workflows.view'] }
};

const createSystemEvent = {
  path: '/system-events',
  verb: 'POST',
  auditMessage: 'creating system event',
  handler: { controller: workflowController, method: 'createSystemEvent' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    body: Joi.object({
      event_key: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      payload_schema: Joi.any().optional(),
      active: Joi.boolean().optional()
    })
  }
};

const updateSystemEvent = {
  path: '/system-events/:event_key',
  verb: 'PUT',
  auditMessage: 'updating system event',
  handler: { controller: workflowController, method: 'updateSystemEvent' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    params: Joi.object({ event_key: Joi.string().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      payload_schema: Joi.any().optional(),
      active: Joi.boolean().optional()
    })
  }
};

const deleteSystemEvent = {
  path: '/system-events/:event_key',
  verb: 'DELETE',
  auditMessage: 'deleting system event',
  handler: { controller: workflowController, method: 'deleteSystemEvent' },
  middleware: { requirePermission: ['admin.workflows.edit'] },
  request: {
    params: Joi.object({ event_key: Joi.string().required() })
  }
};

// ─── Dynamic Variables ────────────────────────────────────────────────────────

const getDynamicVariables = {
  path: '/dynamic-variables',
  verb: 'GET',
  auditMessage: 'getting dynamic variables',
  handler: { controller: dynamicVariablesController, method: 'getAll' },
  middleware: { requirePermission: ['admin.dynamic_variables.view'] }
};

const createDynamicVariable = {
  path: '/dynamic-variables',
  verb: 'POST',
  auditMessage: 'creating dynamic variable',
  handler: { controller: dynamicVariablesController, method: 'create' },
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
  handler: { controller: dynamicVariablesController, method: 'update' },
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
  handler: { controller: dynamicVariablesController, method: 'delete' },
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
    getWorkflows,
    getWorkflowDetails,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getSystemEvents,
    createSystemEvent,
    updateSystemEvent,
    deleteSystemEvent,
    getDynamicVariables,
    createDynamicVariable,
    updateDynamicVariable,
    deleteDynamicVariable
  ]
};

module.exports = new ApiSchema(AdminApi);
