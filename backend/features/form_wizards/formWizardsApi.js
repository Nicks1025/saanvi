const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const QueryHelper = require('../../database/queryHelper');

const FormWizardsRepository = require('./formWizardsRepository');
const FormWizardsService = require('./formWizardsService');
const FormWizardsController = require('./formWizardsController');

// We need the objects repository to inject into wizard service
const ObjectsRepository = require('../objects/objectsRepository');

const queryHelper = new QueryHelper();
const objectsRepository = new ObjectsRepository(queryHelper);
const formWizardsRepository = new FormWizardsRepository(queryHelper);
const formWizardsService = new FormWizardsService(formWizardsRepository, objectsRepository);
const formWizardsController = new FormWizardsController(formWizardsService);

// ─── Form Wizards ──────────────────────────────────────────────────────────────
const listWizards = {
  path: '/',
  verb: 'GET',
  auditMessage: 'list wizards',
  handler: { controller: formWizardsController, method: 'listWizards' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] }
};

const getWizard = {
  path: '/:uuid',
  verb: 'GET',
  auditMessage: 'get wizard',
  handler: { controller: formWizardsController, method: 'getWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] },
  request: { params: Joi.object({ uuid: Joi.string().uuid().required() }) }
};

const createWizard = {
  path: '/',
  verb: 'POST',
  auditMessage: 'create wizard',
  handler: { controller: formWizardsController, method: 'createWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.create'] },
  request: {
    body: Joi.object({
      object_uuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      type: Joi.string().valid('INTERNAL', 'EXTERNAL').required()
    })
  }
};

const updateWizard = {
  path: '/:uuid',
  verb: 'PUT',
  auditMessage: 'update wizard',
  handler: { controller: formWizardsController, method: 'updateWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ uuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('INTERNAL', 'EXTERNAL').required()
    })
  }
};

const deleteWizard = {
  path: '/:uuid',
  verb: 'DELETE',
  auditMessage: 'delete wizard',
  handler: { controller: formWizardsController, method: 'deleteWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.delete'] },
  request: {
    params: Joi.object({ uuid: Joi.string().uuid().required() })
  }
};

// ─── Phases ───────────────────────────────────────────────────────────────────
const listPhases = {
  path: '/:wizardUuid/phases',
  verb: 'GET',
  auditMessage: 'list phases',
  handler: { controller: formWizardsController, method: 'listPhases' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] },
  request: { params: Joi.object({ wizardUuid: Joi.string().uuid().required() }) }
};

const createPhase = {
  path: '/:wizardUuid/phases',
  verb: 'POST',
  auditMessage: 'create phase',
  handler: { controller: formWizardsController, method: 'createPhase' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ wizardUuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      display_order: Joi.number().optional()
    })
  }
};

const updatePhase = {
  path: '/:wizardUuid/phases/:phaseUuid',
  verb: 'PUT',
  auditMessage: 'update phase',
  handler: { controller: formWizardsController, method: 'updatePhase' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      display_order: Joi.number().optional()
    })
  }
};

const deletePhase = {
  path: '/:wizardUuid/phases/:phaseUuid',
  verb: 'DELETE',
  auditMessage: 'delete phase',
  handler: { controller: formWizardsController, method: 'deletePhase' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    })
  }
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const listSteps = {
  path: '/:wizardUuid/phases/:phaseUuid/steps',
  verb: 'GET',
  auditMessage: 'list steps',
  handler: { controller: formWizardsController, method: 'listSteps' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] },
  request: { 
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    }) 
  }
};

const createStep = {
  path: '/:wizardUuid/phases/:phaseUuid/steps',
  verb: 'POST',
  auditMessage: 'create step',
  handler: { controller: formWizardsController, method: 'createStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      template_uuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      display_order: Joi.number().optional()
    })
  }
};

const updateStep = {
  path: '/:wizardUuid/phases/:phaseUuid/steps/:stepUuid',
  verb: 'PUT',
  auditMessage: 'update step',
  handler: { controller: formWizardsController, method: 'updateStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required(),
      stepUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      template_uuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      display_order: Joi.number().optional()
    })
  }
};

const deleteStep = {
  path: '/:wizardUuid/phases/:phaseUuid/steps/:stepUuid',
  verb: 'DELETE',
  auditMessage: 'delete step',
  handler: { controller: formWizardsController, method: 'deleteStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ 
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required(),
      stepUuid: Joi.string().uuid().required()
    })
  }
};

// ─── Public Wizards ───────────────────────────────────────────────────────────
const getPublicWizard = {
  path: '/:name',
  verb: 'GET',
  handler: { controller: formWizardsController, method: 'getPublicWizard' },
  request: { params: Joi.object({ name: Joi.string().required() }) }
};

const submitPublicWizard = {
  path: '/:name',
  verb: 'POST',
  handler: { controller: formWizardsController, method: 'submitPublicWizard' },
  request: { 
    params: Joi.object({ name: Joi.string().required() }),
    body: Joi.object().unknown(true),
    stripUnknown: false
  }
};

const FormWizardsApi = {
  name: 'Form Wizards',
  url: '/api/form-wizards',
  endpoints: [
    listWizards, getWizard, createWizard, updateWizard, deleteWizard,
    listPhases, createPhase, updatePhase, deletePhase,
    listSteps, createStep, updateStep, deleteStep
  ]
};

const PublicWizardsApi = {
  name: 'Public Form Wizards',
  url: '/api/public-wizards',
  endpoints: [
    getPublicWizard,
    submitPublicWizard
  ]
};

module.exports = {
  register: (app) => {
    new ApiSchema(FormWizardsApi).register(app);
    new ApiSchema(PublicWizardsApi).register(app);
  }
};
