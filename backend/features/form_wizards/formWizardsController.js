const BaseController = require('../../base/baseController');
const FormWizardsService = require('./formWizardsService');

class FormWizardsController extends BaseController {
  constructor(context = null) {
    super(context);
    this.formWizardsService = new FormWizardsService(context);
  }

  // --- Wizards ---
  async listWizards(req, res) {
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const wizards = await this.formWizardsService.listWizards(user.uuid);
    return this.respondOk(wizards);
  }

  async getWizard(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const wizard = await this.formWizardsService.getWizard(params.uuid, user.uuid);
    return this.respondOk(wizard);
  }

  async createWizard(req, res) {
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const wizard = await this.formWizardsService.createWizard(body, user.uuid);
    return this.respondOk(wizard, 'Wizard created successfully', 201);
  }

  async updateWizard(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const wizard = await this.formWizardsService.updateWizard(params.uuid, user.uuid, body);
    return this.respondOk(wizard, 'Wizard updated successfully');
  }

  async deleteWizard(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.formWizardsService.deleteWizard(params.uuid, user.uuid);
    return this.respondOk(null, 'Wizard deleted successfully');
  }

  // --- Phases ---
  async listPhases(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const phases = await this.formWizardsService.listPhases(params.wizardUuid, user.uuid);
    return this.respondOk(phases);
  }

  async createPhase(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const phase = await this.formWizardsService.createPhase(params.wizardUuid, user.uuid, body);
    return this.respondOk(phase, 'Phase created successfully', 201);
  }

  async updatePhase(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const phase = await this.formWizardsService.updatePhase(params.wizardUuid, params.phaseUuid, user.uuid, body);
    return this.respondOk(phase, 'Phase updated successfully');
  }

  async deletePhase(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.formWizardsService.deletePhase(params.wizardUuid, params.phaseUuid, user.uuid);
    return this.respondOk(null, 'Phase deleted successfully');
  }

  // --- Steps ---
  async listSteps(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const steps = await this.formWizardsService.listSteps(params.wizardUuid, params.phaseUuid, user.uuid);
    return this.respondOk(steps);
  }

  async createStep(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const step = await this.formWizardsService.createStep(params.wizardUuid, params.phaseUuid, user.uuid, body);
    return this.respondOk(step, 'Step created successfully', 201);
  }

  async updateStep(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const step = await this.formWizardsService.updateStep(params.wizardUuid, params.phaseUuid, params.stepUuid, user.uuid, body);
    return this.respondOk(step, 'Step updated successfully');
  }

  async deleteStep(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.formWizardsService.deleteStep(params.wizardUuid, params.phaseUuid, params.stepUuid, user.uuid);
    return this.respondOk(null, 'Step deleted successfully');
  }

  // --- Public External Endpoints ---
  async getPublicWizard(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const wizard = await this.formWizardsService.getPublicWizard(params.name);
      return this.respondOk(wizard);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async submitPublicWizard(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const result = await this.formWizardsService.submitPublicWizard(params.name, body);
      return this.respondOk(result, 'Wizard submitted successfully');
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  // --- Internal Wizard Endpoints ---
  async getInternalWizard(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const wizard = await this.formWizardsService.getInternalWizard(params.pageUrl, user.uuid);
      return this.respondOk(wizard);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async submitInternalWizard(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const result = await this.formWizardsService.submitInternalWizard(params.pageUrl, body, user.uuid);
      return this.respondOk(result, 'Record created successfully');
    } catch (err) {
      return this.respondError(err, 400);
    }
  }
}

module.exports = FormWizardsController;
