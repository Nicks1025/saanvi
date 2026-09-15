const BaseController = require('../../base/baseController');

class FormWizardsController extends BaseController {
  constructor(formWizardsService) {
    super();
    this.formWizardsService = formWizardsService;
  }

  // --- Wizards ---
  listWizards = async (req, res) => {
    const userUuid = req.user.uuid;
    const wizards = await this.formWizardsService.listWizards(userUuid);
    this.sendSuccess(res, wizards);
  };

  getWizard = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    const wizard = await this.formWizardsService.getWizard(uuid, userUuid);
    this.sendSuccess(res, wizard);
  };

  createWizard = async (req, res) => {
    const userUuid = req.user.uuid;
    const wizard = await this.formWizardsService.createWizard(req.body, userUuid);
    this.sendSuccess(res, wizard, 'Wizard created successfully');
  };

  updateWizard = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    const wizard = await this.formWizardsService.updateWizard(uuid, userUuid, req.body);
    this.sendSuccess(res, wizard, 'Wizard updated successfully');
  };

  deleteWizard = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    await this.formWizardsService.deleteWizard(uuid, userUuid);
    this.sendSuccess(res, null, 'Wizard deleted successfully');
  };

  // --- Phases ---
  listPhases = async (req, res) => {
    const { wizardUuid } = req.params;
    const userUuid = req.user.uuid;
    const phases = await this.formWizardsService.listPhases(wizardUuid, userUuid);
    this.sendSuccess(res, phases);
  };

  createPhase = async (req, res) => {
    const { wizardUuid } = req.params;
    const userUuid = req.user.uuid;
    const phase = await this.formWizardsService.createPhase(wizardUuid, userUuid, req.body);
    this.sendSuccess(res, phase, 'Phase created successfully');
  };

  updatePhase = async (req, res) => {
    const { wizardUuid, phaseUuid } = req.params;
    const userUuid = req.user.uuid;
    const phase = await this.formWizardsService.updatePhase(wizardUuid, phaseUuid, userUuid, req.body);
    this.sendSuccess(res, phase, 'Phase updated successfully');
  };

  deletePhase = async (req, res) => {
    const { wizardUuid, phaseUuid } = req.params;
    const userUuid = req.user.uuid;
    await this.formWizardsService.deletePhase(wizardUuid, phaseUuid, userUuid);
    this.sendSuccess(res, null, 'Phase deleted successfully');
  };

  // --- Steps ---
  listSteps = async (req, res) => {
    const { wizardUuid, phaseUuid } = req.params;
    const userUuid = req.user.uuid;
    const steps = await this.formWizardsService.listSteps(wizardUuid, phaseUuid, userUuid);
    this.sendSuccess(res, steps);
  };

  createStep = async (req, res) => {
    const { wizardUuid, phaseUuid } = req.params;
    const userUuid = req.user.uuid;
    const step = await this.formWizardsService.createStep(wizardUuid, phaseUuid, userUuid, req.body);
    this.sendSuccess(res, step, 'Step created successfully');
  };

  updateStep = async (req, res) => {
    const { wizardUuid, phaseUuid, stepUuid } = req.params;
    const userUuid = req.user.uuid;
    const step = await this.formWizardsService.updateStep(wizardUuid, phaseUuid, stepUuid, userUuid, req.body);
    this.sendSuccess(res, step, 'Step updated successfully');
  };

  deleteStep = async (req, res) => {
    const { wizardUuid, phaseUuid, stepUuid } = req.params;
    const userUuid = req.user.uuid;
    await this.formWizardsService.deleteStep(wizardUuid, phaseUuid, stepUuid, userUuid);
    this.sendSuccess(res, null, 'Step deleted successfully');
  };

  // --- Public External Endpoints ---
  getPublicWizard = async (req, res) => {
    try {
      const { name } = req.params;
      const wizard = await this.formWizardsService.getPublicWizard(name);
      this.sendSuccess(res, wizard);
    } catch (err) {
      this.sendError(res, err);
    }
  };

  submitPublicWizard = async (req, res) => {
    try {
      const { name } = req.params;
      const result = await this.formWizardsService.submitPublicWizard(name, req.body);
      this.sendSuccess(res, result, 'Wizard submitted successfully');
    } catch (err) {
      this.sendError(res, err);
    }
  };
}

module.exports = FormWizardsController;
