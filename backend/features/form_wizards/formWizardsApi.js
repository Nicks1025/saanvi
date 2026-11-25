const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const FormWizardsController = require('./formWizardsController');

// ─── Form Wizards ──────────────────────────────────────────────────────────────
const listWizards = {
  path: '/',
  verb: 'GET',
  auditMessage: 'list wizards',
  handler: { controller: FormWizardsController, method: 'listWizards' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] }
};

const getWizard = {
  path: '/:uuid',
  verb: 'GET',
  auditMessage: 'get wizard',
  handler: { controller: FormWizardsController, method: 'getWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] },
  request: { params: Joi.object({ uuid: Joi.string().uuid().required() }) }
};

const createWizard = {
  path: '/',
  verb: 'POST',
  auditMessage: 'create wizard',
  handler: { controller: FormWizardsController, method: 'createWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.create'] },
  request: {
    body: Joi.object({
      objectUuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      type: Joi.string().valid('INTERNAL', 'EXTERNAL').required(),
      url: Joi.string().allow('', null).optional()
    })
  }
};

const updateWizard = {
  path: '/:uuid',
  verb: 'PUT',
  auditMessage: 'update wizard',
  handler: { controller: FormWizardsController, method: 'updateWizard' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ uuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('INTERNAL', 'EXTERNAL').required(),
      url: Joi.string().allow('', null).optional()
    })
  }
};

const deleteWizard = {
  path: '/:uuid',
  verb: 'DELETE',
  auditMessage: 'delete wizard',
  handler: { controller: FormWizardsController, method: 'deleteWizard' },
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
  handler: { controller: FormWizardsController, method: 'listPhases' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.view'] },
  request: { params: Joi.object({ wizardUuid: Joi.string().uuid().required() }) }
};

const createPhase = {
  path: '/:wizardUuid/phases',
  verb: 'POST',
  auditMessage: 'create phase',
  handler: { controller: FormWizardsController, method: 'createPhase' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({ wizardUuid: Joi.string().uuid().required() }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      displayOrder: Joi.number().optional()
    })
  }
};

const updatePhase = {
  path: '/:wizardUuid/phases/:phaseUuid',
  verb: 'PUT',
  auditMessage: 'update phase',
  handler: { controller: FormWizardsController, method: 'updatePhase' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      displayOrder: Joi.number().optional()
    })
  }
};

const deletePhase = {
  path: '/:wizardUuid/phases/:phaseUuid',
  verb: 'DELETE',
  auditMessage: 'delete phase',
  handler: { controller: FormWizardsController, method: 'deletePhase' },
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
  handler: { controller: FormWizardsController, method: 'listSteps' },
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
  handler: { controller: FormWizardsController, method: 'createStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      templateUuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      displayOrder: Joi.number().optional()
    })
  }
};

const updateStep = {
  path: '/:wizardUuid/phases/:phaseUuid/steps/:stepUuid',
  verb: 'PUT',
  auditMessage: 'update step',
  handler: { controller: FormWizardsController, method: 'updateStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required(),
      stepUuid: Joi.string().uuid().required()
    }),
    body: Joi.object({
      templateUuid: Joi.string().uuid().required(),
      name: Joi.string().required(),
      description: Joi.string().optional().allow(null, ''),
      displayOrder: Joi.number().optional()
    })
  }
};

const deleteStep = {
  path: '/:wizardUuid/phases/:phaseUuid/steps/:stepUuid',
  verb: 'DELETE',
  auditMessage: 'delete step',
  handler: { controller: FormWizardsController, method: 'deleteStep' },
  middleware: { requireAuth: true, requirePermission: ['form_wizards.edit'] },
  request: {
    params: Joi.object({
      wizardUuid: Joi.string().uuid().required(),
      phaseUuid: Joi.string().uuid().required(),
      stepUuid: Joi.string().uuid().required()
    })
  }
};

// ─── Internal Wizards ─────────────────────────────────────────────────────────
const getInternalWizard = {
  path: '/internal/:pageUrl',
  verb: 'GET',
  auditMessage: 'get internal wizard',
  handler: { controller: FormWizardsController, method: 'getInternalWizard' },
  middleware: { requireAuth: true },
  request: { params: Joi.object({ pageUrl: Joi.string().required() }) }
};

const submitInternalWizard = {
  path: '/internal/:pageUrl',
  verb: 'POST',
  auditMessage: 'submit internal wizard',
  handler: { controller: FormWizardsController, method: 'submitInternalWizard' },
  middleware: { requireAuth: true },
  request: {
    params: Joi.object({ pageUrl: Joi.string().required() }),
    body: Joi.object().unknown(true),
    stripUnknown: false
  }
};

// ─── Public Wizards ───────────────────────────────────────────────────────────
const getPublicWizard = {
  path: '/:name',
  verb: 'GET',
  handler: { controller: FormWizardsController, method: 'getPublicWizard' },
  request: { params: Joi.object({ name: Joi.string().required() }) }
};

const submitPublicWizard = {
  path: '/:name',
  verb: 'POST',
  handler: { controller: FormWizardsController, method: 'submitPublicWizard' },
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
    listSteps, createStep, updateStep, deleteStep,
    getInternalWizard, submitInternalWizard
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
