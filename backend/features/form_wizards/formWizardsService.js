const BaseService = require('../../base/baseService');
const FormWizardsRepository = require('./formWizardsRepository');
const ObjectsRepository = require('../objects/objectsRepository');

class FormWizardsService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new FormWizardsRepository(context);
    this.objectsRepository = new ObjectsRepository(context);
  }

  _mapWizard(w) {
    if (!w) return null;
    return {
      uuid: w.uuid,
      name: w.name,
      url: w.url,
      type: w.type,
      objectUuid: w.object_uuid,
      createdBy: w.created_by,
      updatedBy: w.updated_by,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    };
  }

  _mapPhase(p) {
    if (!p) return null;
    return {
      uuid: p.uuid,
      wizardUuid: p.wizard_uuid,
      name: p.name,
      description: p.description,
      displayOrder: p.display_order || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }

  _mapStep(s) {
    if (!s) return null;
    return {
      uuid: s.uuid,
      phaseUuid: s.phase_uuid,
      templateUuid: s.template_uuid,
      name: s.name,
      description: s.description,
      displayOrder: s.display_order || 0,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    };
  }

  // --- Wizards ---
  async listWizards(userUuid) {
    const list = await this.repository.listWizards(userUuid);
    return (list || []).map(w => this._mapWizard(w));
  }

  async getWizard(uuid, userUuid) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found or you do not have permission');
    return this._mapWizard(wizard);
  }

  async createWizard(data, userUuid) {
    const objectUuid = data.objectUuid;
    const object = await this.objectsRepository.getObjectByUuid(objectUuid, userUuid);
    if (!object) {
      throw new Error('Object not found or you do not have permission to use it');
    }

    const existingWizard = await this.repository.getWizardByName(data.name);
    if (existingWizard) {
      throw new Error(`Wizard already exists with name: ${data.name}`);
    }

    let url = data.url ? String(data.url).trim() : null;
    if (url && /\s/.test(url)) {
      throw new Error('Target URL cannot contain spaces');
    }
    if (!url && data.name) {
      url = String(data.name).trim().replace(/\s+/g, '-');
    }

    if (url) {
      const existingByUrl = await this.repository.getWizardByUrl(url);
      if (existingByUrl) {
        throw new Error(`Wizard already exists with target URL: ${url}`);
      }
    }

    const wizard = await this.repository.createWizard({
      object_uuid: objectUuid,
      name: data.name,
      url: url,
      type: data.type,
      created_by: userUuid,
      updated_by: userUuid
    });

    return this._mapWizard(wizard);
  }

  async updateWizard(uuid, userUuid, data) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found');

    if (data.name && data.name !== wizard.name) {
      const existingWizard = await this.repository.getWizardByName(data.name);
      if (existingWizard && existingWizard.uuid !== uuid) {
        throw new Error(`Wizard already exists with name: ${data.name}`);
      }
    }

    let url = data.url !== undefined
      ? (data.url ? String(data.url).trim() : null)
      : wizard.url;

    if (url && /\s/.test(url)) {
      throw new Error('Target URL cannot contain spaces');
    }

    if (!url && data.name) {
      url = String(data.name).trim().replace(/\s+/g, '-');
    }

    if (url && url !== wizard.url) {
      const existingByUrl = await this.repository.getWizardByUrl(url);
      if (existingByUrl && existingByUrl.uuid !== uuid) {
        throw new Error(`Wizard already exists with target URL: ${url}`);
      }
    }

    const updated = await this.repository.updateWizard(uuid, userUuid, {
      name: data.name,
      url: url,
      type: data.type,
      updated_by: userUuid
    });
    return this._mapWizard(updated);
  }

  async deleteWizard(uuid, userUuid) {
    const wizard = await this.repository.getWizardByUuid(uuid, userUuid);
    if (!wizard) throw new Error('Wizard not found');

    return await this.repository.deleteWizard(uuid, userUuid);
  }

  // --- Phases ---
  async listPhases(wizardUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid);
    const phases = await this.repository.listPhases(wizardUuid);
    return (phases || []).map(p => this._mapPhase(p));
  }

  async createPhase(wizardUuid, userUuid, data) {
    await this.getWizard(wizardUuid, userUuid);

    const created = await this.repository.createPhase({
      wizard_uuid: wizardUuid,
      name: data.name,
      description: data.description || null,
      display_order: data.displayOrder || 0
    });
    return this._mapPhase(created);
  }

  async updatePhase(wizardUuid, phaseUuid, userUuid, data) {
    await this.getWizard(wizardUuid, userUuid);

    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');

    const updated = await this.repository.updatePhase(phaseUuid, wizardUuid, {
      name: data.name,
      description: data.description,
      display_order: data.displayOrder
    });
    return this._mapPhase(updated);
  }

  async deletePhase(wizardUuid, phaseUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid);
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');

    return await this.repository.deletePhase(phaseUuid, wizardUuid);
  }

  // --- Steps ---
  async listSteps(wizardUuid, phaseUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid);
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');

    const steps = await this.repository.listSteps(phaseUuid);
    return (steps || []).map(s => this._mapStep(s));
  }

  async createStep(wizardUuid, phaseUuid, userUuid, data) {
    const wizard = await this.getWizard(wizardUuid, userUuid);

    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found or does not belong to this Wizard');

    const templateUuid = data.templateUuid;
    if (!templateUuid) {
      throw new Error('templateUuid is required');
    }

    const isValid = await this.repository.isTemplateBelongsToObject(templateUuid, wizard.objectUuid);
    if (!isValid) {
      throw new Error('Template does not belong to the selected Object');
    }

    const created = await this.repository.createStep({
      phase_uuid: phaseUuid,
      template_uuid: templateUuid,
      name: data.name,
      description: data.description || null,
      display_order: data.displayOrder || 0
    });
    return this._mapStep(created);
  }

  async updateStep(wizardUuid, phaseUuid, stepUuid, userUuid, data) {
    const wizard = await this.getWizard(wizardUuid, userUuid);

    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found or does not belong to this Wizard');

    const step = await this.repository.getStepByUuid(stepUuid, phaseUuid);
    if (!step) throw new Error('Step not found');

    const templateUuid = data.templateUuid || step.template_uuid;
    if (data.templateUuid && data.templateUuid !== step.template_uuid) {
      const isValid = await this.repository.isTemplateBelongsToObject(data.templateUuid, wizard.objectUuid);
      if (!isValid) {
        throw new Error('Template does not belong to the selected Object');
      }
    }

    const updated = await this.repository.updateStep(stepUuid, phaseUuid, {
      template_uuid: templateUuid,
      name: data.name,
      description: data.description,
      display_order: data.displayOrder ?? step.display_order
    });
    return this._mapStep(updated);
  }

  async deleteStep(wizardUuid, phaseUuid, stepUuid, userUuid) {
    await this.getWizard(wizardUuid, userUuid);
    const phase = await this.repository.getPhaseByUuid(phaseUuid, wizardUuid);
    if (!phase) throw new Error('Phase not found');

    return await this.repository.deleteStep(stepUuid, phaseUuid);
  }

  // --- Public View ---
  async getPublicWizard(name) {
    const wizard = await this.repository.getPublicWizardByIdentifier(name);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'EXTERNAL') throw new Error('Wizard is not accessible publicly');

    const phases = await this.repository.listPhases(wizard.uuid);
    const phasesWithSteps = [];
    const fields = await this.objectsRepository.listFields(wizard.object_uuid);

    for (const phase of phases) {
      const steps = await this.repository.listSteps(phase.uuid);
      const enrichedSteps = [];

      for (const step of steps) {
        const template = await this.objectsRepository.getTemplateByUuid(wizard.object_uuid, step.template_uuid);
        let layout = [];
        if (template && template.jsonBuilderConfig) {
          let config = template.jsonBuilderConfig;
          if (typeof config === 'string') {
            try { config = JSON.parse(config); } catch (e) { config = []; }
          }
          layout = config;
        }

        enrichedSteps.push({
          ...step,
          template: {
            uuid: template ? template.uuid : null,
            name: template ? template.name : null,
            layout: layout
          }
        });
      }

      phasesWithSteps.push({
        ...phase,
        steps: enrichedSteps
      });
    }

    return {
      wizard: {
        uuid: wizard.uuid,
        name: wizard.name,
        url: wizard.url,
        type: wizard.type,
      },
      phases: phasesWithSteps,
      fields: fields.map(f => ({
        uuid: f.uuid,
        fieldName: f.field_name,
        label: f.label,
        fieldType: f.field_type,
        placeholder: f.placeholder,
        defaultValue: f.default_value,
        isRequired: Boolean(f.is_required),
        options: f.options,
        validationRules: f.validation_rules
      }))
    };
  }

  async submitPublicWizard(name, payload) {
    const wizard = await this.repository.getPublicWizardByIdentifier(name);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'EXTERNAL') throw new Error('Wizard is not accessible publicly');

    const fields = await this.objectsRepository.listFields(wizard.object_uuid);
    const recordData = {};

    for (const field of fields) {
      let val = payload[field.field_name];

      if (field.is_required && (val === undefined || val === null || val === '')) {
        throw new Error(`Field ${field.label} is required`);
      }

      if (val !== undefined && val !== null && val !== '') {
        if (field.field_type === 'NUMBER' && isNaN(Number(val))) {
          throw new Error(`Field ${field.label} must be a valid number`);
        }

        if (field.options && (field.field_type === 'SELECT' || field.field_type === 'RADIO')) {
          let opts = field.options;
          if (typeof opts === 'string') opts = JSON.parse(opts);
          const validValues = Array.isArray(opts) ? opts.map(o => o.value || o) : [];
          if (!validValues.includes(val)) {
            throw new Error(`Invalid value for ${field.label}`);
          }
        }

        recordData[field.field_name] = String(val);
      }
    }

    await this.objectsRepository.createRecord(wizard.object_uuid, recordData);
    return { success: true };
  }

  // --- Internal Wizard Runner & Records ---
  async getInternalWizard(identifier, userUuid) {
    const wizard = await this.repository.getPublicWizardByIdentifier(identifier);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'INTERNAL') throw new Error('Wizard is not an internal wizard');

    const object = await this.objectsRepository.getObjectByUuid(wizard.object_uuid, userUuid);
    const phases = await this.repository.listPhases(wizard.uuid);
    const phasesWithSteps = [];
    const fields = await this.objectsRepository.listFields(wizard.object_uuid);

    for (const phase of phases) {
      const steps = await this.repository.listSteps(phase.uuid);
      const enrichedSteps = [];
      for (const step of steps) {
        const template = await this.objectsRepository.getTemplateByUuid(wizard.object_uuid, step.template_uuid);
        let layout = [];
        if (template && template.jsonBuilderConfig) {
          let config = template.jsonBuilderConfig;
          if (typeof config === 'string') {
            try { config = JSON.parse(config); } catch (e) { config = []; }
          }
          layout = config;
        }
        enrichedSteps.push({
          ...step,
          template: {
            uuid: template ? template.uuid : null,
            name: template ? template.name : null,
            layout: layout
          }
        });
      }
      phasesWithSteps.push({
        ...phase,
        steps: enrichedSteps
      });
    }

    return {
      wizard: {
        uuid: wizard.uuid,
        name: wizard.name,
        url: wizard.url,
        type: wizard.type,
        objectUuid: wizard.object_uuid
      },
      object: object ? { uuid: object.uuid, name: object.name } : null,
      phases: phasesWithSteps,
      fields: fields.map(f => ({
        uuid: f.uuid,
        fieldName: f.field_name,
        label: f.label,
        fieldType: f.field_type,
        placeholder: f.placeholder,
        defaultValue: f.default_value,
        isRequired: Boolean(f.is_required),
        options: f.options,
        validationRules: f.validation_rules
      }))
    };
  }

  async submitInternalWizard(identifier, payload, userUuid) {
    const wizard = await this.repository.getPublicWizardByIdentifier(identifier);
    if (!wizard) throw new Error('Wizard not found');
    if (wizard.type !== 'INTERNAL') throw new Error('Wizard is not an internal wizard');

    const fields = await this.objectsRepository.listFields(wizard.object_uuid);
    const recordData = {};

    for (const field of fields) {
      let val = payload[field.field_name];
      if (field.is_required && (val === undefined || val === null || val === '')) {
        throw new Error(`Field ${field.label} is required`);
      }
      if (val !== undefined && val !== null && val !== '') {
        if (field.field_type === 'NUMBER' && isNaN(Number(val))) {
          throw new Error(`Field ${field.label} must be a valid number`);
        }
        if (field.options && (field.field_type === 'SELECT' || field.field_type === 'RADIO')) {
          let opts = field.options;
          if (typeof opts === 'string') opts = JSON.parse(opts);
          const validValues = Array.isArray(opts) ? opts.map(o => o.value || o) : [];
          if (!validValues.includes(val)) {
            throw new Error(`Invalid value for ${field.label}`);
          }
        }
        recordData[field.field_name] = String(val);
      }
    }

    await this.objectsRepository.createRecord(wizard.object_uuid, recordData);
    return { success: true };
  }
}

module.exports = FormWizardsService;
