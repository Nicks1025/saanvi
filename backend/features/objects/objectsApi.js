const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const QueryHelper = require('../../database/queryHelper');

const ObjectsRepository = require('./objectsRepository');
const ObjectsService = require('./objectsService');
const ObjectsController = require('./objectsController');

const queryHelper = new QueryHelper();
const objectsRepository = new ObjectsRepository(queryHelper);
const objectsService = new ObjectsService(objectsRepository);
const objectsController = new ObjectsController(objectsService);

// ─── Objects ────────────────────────────────────────────────────────────────────
const listObjects = {
  path: '/',
  verb: 'GET',
  auditMessage: 'list objects',
  handler: { controller: objectsController, method: 'listObjects' },
  middleware: { requireAuth: true, requirePermission: ['objects.view'] }
};

const getObject = {
  path: '/:uuid',
  verb: 'GET',
  auditMessage: 'get object',
  handler: { controller: objectsController, method: 'getObject' },
  middleware: { requireAuth: true, requirePermission: ['objects.view'] },
  request: { params: Joi.object({ uuid: Joi.string().uuid().required() }) }
};

const createObject = {
  path: '/',
  verb: 'POST',
  auditMessage: 'create object',
  handler: { controller: objectsController, method: 'createObject' },
  middleware: { requireAuth: true, requirePermission: ['objects.create'] },
  request: {
    body: Joi.object({
      name: Joi.string().required()
    })
  }
};

const updateObject = {
  path: '/:uuid',
  verb: 'PUT',
  auditMessage: 'update object',
  handler: { controller: objectsController, method: 'updateObject' },
  middleware: { requireAuth: true, requirePermission: ['objects.edit'] },
  request: {
    params: Joi.object({ uuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required()
    })
  }
};

const deleteObject = {
  path: '/:uuid',
  verb: 'DELETE',
  auditMessage: 'delete object',
  handler: { controller: objectsController, method: 'deleteObject' },
  middleware: { requireAuth: true, requirePermission: ['objects.delete'] },
  request: {
    params: Joi.object({ uuid: Joi.string().uuid().required() })
  }
};

const listFields = {
  path: '/:objectUuid/fields',
  verb: 'GET',
  auditMessage: 'list fields',
  handler: { controller: objectsController, method: 'listFields' },
  middleware: { requireAuth: true, requirePermission: ['objects.fields.view'] },
  request: { params: Joi.object({ objectUuid: Joi.string().uuid().required() }) }
};

const createField = {
  path: '/:objectUuid/fields',
  verb: 'POST',
  auditMessage: 'create field',
  handler: { controller: objectsController, method: 'createField' },
  middleware: { requireAuth: true, requirePermission: ['objects.fields.create'] },
  request: {
    params: Joi.object({ objectUuid: Joi.string().uuid().required() }),
    body: Joi.object({
      field_name: Joi.string().required(),
      label: Joi.string().required(),
      field_type: Joi.string().required(),
      placeholder: Joi.string().optional().allow(null, ''),
      default_value: Joi.string().optional().allow(null, ''),
      is_required: Joi.boolean().optional(),
      options: Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object()).optional().allow(null),
      validation_rules: Joi.object().optional().allow(null),
      display_order: Joi.number().optional()
    })
  }
};

const updateField = {
  path: '/:objectUuid/fields/:fieldUuid',
  verb: 'PUT',
  auditMessage: 'update field',
  handler: { controller: objectsController, method: 'updateField' },
  middleware: { requireAuth: true, requirePermission: ['objects.fields.edit'] },
  request: {
    params: Joi.object({ 
      objectUuid: Joi.string().uuid().required(),
      fieldUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      label: Joi.string().optional(),
      field_type: Joi.string().optional(),
      placeholder: Joi.string().optional().allow(null, ''),
      default_value: Joi.string().optional().allow(null, ''),
      is_required: Joi.boolean().optional(),
      options: Joi.alternatives().try(Joi.string(), Joi.array(), Joi.object()).optional().allow(null),
      validation_rules: Joi.object().optional().allow(null),
      display_order: Joi.number().optional()
    })
  }
};

const archiveField = {
  path: '/:objectUuid/fields/:fieldUuid',
  verb: 'DELETE',
  auditMessage: 'archive field',
  handler: { controller: objectsController, method: 'archiveField' },
  middleware: { requireAuth: true, requirePermission: ['objects.fields.delete'] },
  request: {
    params: Joi.object({
      objectUuid: Joi.string().uuid().required(),
      fieldUuid: Joi.string().uuid().required()
    })
  }
};

const bulkSaveFields = {
  path: '/:objectUuid/fields/bulk',
  verb: 'POST',
  auditMessage: 'bulk save object fields',
  handler: { controller: objectsController, method: 'bulkSaveFields' },
  middleware: { requireAuth: true, requirePermission: ['objects.fields.edit'] },
  request: {
    params: Joi.object({ objectUuid: Joi.string().uuid().required() }),
    body: Joi.object({
      fields: Joi.array().items(Joi.object().unknown(true)).required(),
      deletedFieldIds: Joi.array().items(Joi.string().uuid()).optional()
    })
  }
};

// ─── Templates ────────────────────────────────────────────────────────────────
const listTemplates = {
  path: '/:objectUuid/templates',
  verb: 'GET',
  auditMessage: 'list templates',
  handler: { controller: objectsController, method: 'listTemplates' },
  middleware: { requireAuth: true, requirePermission: ['objects.templates.view'] },
  request: { params: Joi.object({ objectUuid: Joi.string().uuid().required() }) }
};

const createTemplate = {
  path: '/:objectUuid/templates',
  verb: 'POST',
  auditMessage: 'create template',
  handler: { controller: objectsController, method: 'createTemplate' },
  middleware: { requireAuth: true, requirePermission: ['objects.templates.create'] },
  request: {
    params: Joi.object({ objectUuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, '')
    })
  }
};

const updateTemplate = {
  path: '/:objectUuid/templates/:templateUuid',
  verb: 'PUT',
  auditMessage: 'update template',
  handler: { controller: objectsController, method: 'updateTemplate' },
  middleware: { requireAuth: true, requirePermission: ['objects.templates.edit'] },
  request: {
    params: Joi.object({ 
      objectUuid: Joi.string().uuid().required(),
      templateUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional().allow(null, ''),
      is_active: Joi.boolean().optional(),
      fields: Joi.array().items(Joi.object({
        field_uuid: Joi.string().uuid().required(),
        row_number: Joi.number().required(),
        column_number: Joi.number().required(),
        width: Joi.number().required(),
        display_order: Joi.number().required()
      })).optional()
    })
  }
};

const deleteTemplate = {
  path: '/:objectUuid/templates/:templateUuid',
  verb: 'DELETE',
  auditMessage: 'delete template',
  handler: { controller: objectsController, method: 'deleteTemplate' },
  middleware: { requireAuth: true, requirePermission: ['objects.templates.delete'] },
  request: {
    params: Joi.object({ 
      objectUuid: Joi.string().uuid().required(),
      templateUuid: Joi.string().uuid().required()
    })
  }
};

// ─── Records ──────────────────────────────────────────────────────────────────
const listRecords = {
  path: '/:objectUuid/records',
  verb: 'GET',
  auditMessage: 'list object records',
  handler: { controller: objectsController, method: 'listRecords' },
  middleware: { requireAuth: true, requirePermission: ['objects.records.view'] },
  request: { params: Joi.object({ objectUuid: Joi.string().uuid().required() }) }
};

const createRecord = {
  path: '/:objectUuid/records',
  verb: 'POST',
  auditMessage: 'create object record',
  handler: { controller: objectsController, method: 'createRecord' },
  middleware: { requireAuth: true, requirePermission: ['objects.records.create'] },
  request: {
    params: Joi.object({ objectUuid: Joi.string().uuid().required() }),
    body: Joi.object().unknown(true), // We allow unknown body fields since it's dynamic
    stripUnknown: false
  }
};

const deleteRecord = {
  path: '/:objectUuid/records/:recordUuid',
  verb: 'DELETE',
  auditMessage: 'delete object record',
  handler: { controller: objectsController, method: 'deleteRecord' },
  middleware: { requireAuth: true, requirePermission: ['objects.records.delete'] },
  request: {
    params: Joi.object({
      objectUuid: Joi.string().uuid().required(),
      recordUuid: Joi.string().uuid().required()
    })
  }
};

const updateRecord = {
  path: '/:objectUuid/records/:recordUuid',
  verb: 'PUT',
  auditMessage: 'update object record',
  handler: { controller: objectsController, method: 'updateRecord' },
  middleware: { requireAuth: true, requirePermission: ['objects.records.update'] },
  request: {
    params: Joi.object({
      objectUuid: Joi.string().uuid().required(),
      recordUuid: Joi.string().uuid().required()
    }),
    body: Joi.object().unknown(true),
    stripUnknown: false
  }
};

const ObjectsApi = {
  name: 'Objects',
  url: '/api/objects',
  endpoints: [
    listObjects, getObject, createObject, updateObject, deleteObject,
    listFields, createField, updateField, archiveField, bulkSaveFields,
    listTemplates, createTemplate, updateTemplate, deleteTemplate,
    listRecords, createRecord, updateRecord, deleteRecord
  ]
};

module.exports = {
  register: (app) => {
    new ApiSchema(ObjectsApi).register(app);
  }
};
