const ApiSchema = require('../../base/apiSchema');
const UserFieldsController = require('./userFieldsController');

const UserFieldsApi = {
  name: 'UserFieldsApi',
  url: 'api',
  endpoints: [
    {
      path: '/admin/users/fields',
      verb: 'GET',
      handler: { controller: UserFieldsController, method: 'getAllFields' },
      tags: ['Admin', 'User Fields'],
      summary: 'Get all dynamic user fields',
      middleware: { requirePermission: ['admin.users.view'] }
    },
    {
      path: '/admin/users/fields',
      verb: 'POST',
      handler: { controller: UserFieldsController, method: 'createField' },
      tags: ['Admin', 'User Fields'],
      summary: 'Create a new dynamic user field',
      middleware: { requirePermission: ['admin.users.edit'] }
    },
    {
      path: '/admin/users/fields/:id',
      verb: 'PUT',
      handler: { controller: UserFieldsController, method: 'updateField' },
      tags: ['Admin', 'User Fields'],
      summary: 'Update dynamic user field metadata',
      middleware: { requirePermission: ['admin.users.edit'] }
    },
    {
      path: '/admin/users/fields/:id',
      verb: 'DELETE',
      handler: { controller: UserFieldsController, method: 'deleteField' },
      tags: ['Admin', 'User Fields'],
      summary: 'Delete a dynamic user field',
      middleware: { requirePermission: ['admin.users.edit'] }
    },
    {
      path: '/public/users/form-config',
      verb: 'GET',
      handler: { controller: UserFieldsController, method: 'getPublicFormConfig' },
      tags: ['Public', 'User Fields'],
      summary: 'Get dynamic fields configuration for rendering forms',
      middleware: { requireAuth: false }
    },
    {
      path: '/admin/users/fields/bulk',
      verb: 'POST',
      handler: { controller: UserFieldsController, method: 'bulkSaveFields' },
      tags: ['Admin', 'User Fields'],
      summary: 'Bulk save and reorder user fields',
      middleware: { requirePermission: ['admin.users.edit'] }
    }
  ]
};

module.exports = new ApiSchema(UserFieldsApi);
